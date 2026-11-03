/**
 * OpenCode Go usage dashboard.
 *
 * OpenCode exposes only one rounded percentage for the whole Go plan, while the
 * plan actually meters every model against its own monthly dollar limit
 * (5-hour = 20% of it, weekly = 50%, monthly = 100%). This plugin rebuilds the
 * per-model picture from the only source that carries it: the token usage the
 * harness records on every assistant message.
 *
 * Data path: scan this month's Session logs once at startup, then fold every
 * live `assistant/message` through the same reducer. Each record keeps the
 * model, the timestamp, and the token counts, so rolling 5-hour, weekly, and
 * calendar-month windows are plain sums.
 *
 * Surfaces: `GET <path>` renders an HTML table that refreshes itself, and
 * `GET <path>.json` returns the same view as JSON. Both are loopback routes on
 * the harness web listener; the harness adds no authentication to plugin routes,
 * so anything that can reach the port can read them.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

export const name = 'opencode-usage'

/** The dashboard needs the web listener; without it the plugin stays dormant. */
export const inject = ['webServer']

const MIB = 1024 * 1024
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const FREE_MODELS = new Set(['beam-free', 'iceman-contributor-free'])

/** Dollars per million tokens, at the plan's off-peak (standard) price. */
const PRICES = {
  'deepseek-v4.1-flash': { input: 0.15, output: 0.6, cacheRead: 0.003 },
  'deepseek-v4-pro': { input: 0.66, output: 1.98, cacheRead: 0.022 },
  'glm-5.3-flash': { input: 0.15, output: 0.5, cacheRead: 0.03 },
  'glm-5.3': { input: 1.4, output: 4.4, cacheRead: 0.26 },
  'glm-5.2': { input: 1.4, output: 4.4, cacheRead: 0.26 },
  'kimi-k3.1-pro': { input: 2, output: 10, cacheRead: 0.2 },
  'kimi-k3': { input: 3, output: 15, cacheRead: 0.3 },
  'kimi-k2.7-code': { input: 0.95, output: 4, cacheRead: 0.19 },
  'longcat-2.0': { input: 0.3, output: 1.2, cacheRead: 0.006 },
  'step-5-preview': { input: 1, output: 2.7, cacheRead: 0.1 },
  'mimo-v2.6-flash': { input: 0.14, output: 0.28, cacheRead: 0.0028 },
  'mimo-v2.6-pro': { input: 0.435, output: 0.87, cacheRead: 0.003625 },
  'minimax-m3.1-flash': { input: 0.15, output: 0.6, cacheRead: 0.015 },
  'minimax-m3': { input: 0.3, output: 1.2, cacheRead: 0.06 },
  'qwen3.8-max': { input: 2, output: 6, cacheRead: 0.25 },
  'qwen3.8-flash': { input: 0.15, output: 0.47, cacheRead: 0.016 },
  'qwen3.7-plus': { input: 0.4, output: 1.6, cacheRead: 0.04 },
  'hy4-preview': { input: 0.834, output: 2.501, cacheRead: 0.042 },
  hy3: { input: 0.14, output: 0.58, cacheRead: 0.035 },
  'grok-4.7': { input: 2, output: 6, cacheRead: 0.5 },
  'gpt-6-luna': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'gpt-5.6-luna': { input: 0.2, output: 1.2, cacheRead: 0.02 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'gemini-4-argon': { input: 2, output: 10, cacheRead: 0.2 },
  'muse-spark-1.2-contributor': { input: 0.1, output: 0.2, cacheRead: 0.002 },
  'muse-spark-1.3-contributor': { input: 0.1, output: 0.2, cacheRead: 0.002 },
  'beam-free': { input: 0, output: 0, cacheRead: 0 },
  'iceman-contributor-free': { input: 0, output: 0, cacheRead: 0 },
}

/** DeepSeek peak hours: both the price AND the allowance burn double. Shared
 *  verbatim with bili's `billing.priceSource` document (see priceDocument), so
 *  the proxy and this dashboard never disagree about which hour is expensive. */
const PEAK = { factor: 2, utcWeekdayHours: [[1, 4], [6, 10]], modelPrefixes: ['deepseek'] }

/**
 * China's statutory holidays, 2026–2031, as month-day pairs (Beijing time).
 *
 * DeepSeek's own API bills these whole days at the off-peak rate even when they
 * fall on a weekday, so `peakMultiplier` honours them for official DeepSeek
 * billing. OpenCode Go does NOT: its maintainers answered the National Day
 * complaint with "Go pricing follows our own schedule, not DeepSeek's holiday
 * calendar" (anomalyco/opencode#53071), and Go meters on a UTC weekday grid. The
 * calendar is therefore opt-in via `holidayAware`, and the default keeps Go's
 * published schedule — the one that actually matches the bill.
 *
 * `2025` reform: 元旦 1 day, 春节 4 (除夕 + 初一..初三), 清明 1, 劳动节 2 (5/1–5/2),
 * 端午 1, 中秋 1, 国庆 3 (10/1–10/3). Weekend makeup days need no entry: Go and
 * DeepSeek both charge weekends at the off-peak rate already. Lunar dates come
 * from `solarlunar`; Qingming from the solar-term table (Apr 4–5).
 */
const HOLIDAYS = {
  2026: ['01-01', '02-16', '02-17', '02-18', '02-19', '04-05', '05-01', '05-02', '06-19', '09-25', '10-01', '10-02', '10-03'],
  2027: ['01-01', '02-05', '02-06', '02-07', '02-08', '04-05', '05-01', '05-02', '06-09', '09-15', '10-01', '10-02', '10-03'],
  2028: ['01-01', '01-25', '01-26', '01-27', '01-28', '04-04', '05-01', '05-02', '05-28', '10-01', '10-02', '10-03'],
  2029: ['01-01', '02-12', '02-13', '02-14', '02-15', '04-04', '05-01', '05-02', '06-16', '09-22', '10-01', '10-02', '10-03'],
  2030: ['01-01', '02-02', '02-03', '02-04', '02-05', '04-05', '05-01', '05-02', '06-05', '09-12', '10-01', '10-02', '10-03'],
  2031: ['01-01', '01-22', '01-23', '01-24', '01-25', '04-05', '05-01', '05-02', '06-24', '10-01', '10-02', '10-03'],
}

/** DeepSeek's own API list price, ¥ per million tokens at the OFF-PEAK rate
 *  (cache hit / input / output). Public pricing page, `deepseek-flash` and
 *  `deepseek-v4-pro`; the peak rate is exactly 2x. Compared against the Go
 *  prices above so the page can point at whichever route is cheaper right now. */
const OFFICIAL = {
  defaultCnyPerUsd: 7.1,
  prices: {
    'deepseek-v4.1-flash': { input: 1, output: 4, cacheRead: 0.02 },
    'deepseek-v4-pro': { input: 4.5, output: 13.5, cacheRead: 0.15 },
  },
}

/** Monthly dollar allowance per model, per plan (USD). */
const LIMITS = {
  go: {
    'deepseek-v4.1-flash': 100,
    'deepseek-v4-pro': 15,
    'glm-5.3-flash': 60,
    'glm-5.3': 15,
    'glm-5.2': 60,
    'kimi-k3.1-pro': 15,
    'kimi-k3': 15,
    'kimi-k2.7-code': 60,
    'longcat-2.0': 60,
    'step-5-preview': 15,
    'mimo-v2.6-flash': 60,
    'mimo-v2.6-pro': 15,
    'minimax-m3.1-flash': 20,
    'minimax-m3': 60,
    'qwen3.8-max': 15,
    'qwen3.8-flash': 30,
    'qwen3.7-plus': 60,
    'hy4-preview': 30,
    hy3: 60,
    'grok-4.7': 15,
    'gpt-6-luna': 15,
    'gpt-5.6-luna': 15,
    'claude-haiku-5-5': 15,
    'gemini-4-argon': 30,
    'muse-spark-1.2-contributor': 60,
    'muse-spark-1.3-contributor': 60,
    'beam-free': Infinity,
    'iceman-contributor-free': Infinity,
  },
  'go-plus': {
    'deepseek-v4.1-flash': 200,
    'deepseek-v4-pro': 60,
    'glm-5.3-flash': 180,
    'glm-5.3': 120,
    'glm-5.2': 180,
    'kimi-k3.1-pro': 60,
    'kimi-k3': 60,
    'kimi-k2.7-code': 180,
    'longcat-2.0': 240,
    'step-5-preview': 60,
    'mimo-v2.6-flash': 120,
    'mimo-v2.6-pro': 60,
    'minimax-m3.1-flash': 80,
    'minimax-m3': 180,
    'qwen3.8-max': 60,
    'qwen3.8-flash': 90,
    'qwen3.7-plus': 180,
    'hy4-preview': 120,
    hy3: 240,
    'grok-4.7': 60,
    'gpt-6-luna': 60,
    'gpt-5.6-luna': 60,
    'claude-haiku-5-5': 60,
    'gemini-4-argon': 120,
    'muse-spark-1.2-contributor': 120,
    'muse-spark-1.3-contributor': 120,
    'beam-free': Infinity,
    'iceman-contributor-free': Infinity,
  },
  'go-teams': {
    'deepseek-v4.1-flash': 105,
    'deepseek-v4-pro': 20,
    'glm-5.3-flash': 65,
    'glm-5.3': 20,
    'glm-5.2': 65,
    'kimi-k3.1-pro': 20,
    'kimi-k3': 20,
    'kimi-k2.7-code': 65,
    'longcat-2.0': 65,
    'step-5-preview': 20,
    'mimo-v2.6-flash': 65,
    'mimo-v2.6-pro': 20,
    'minimax-m3.1-flash': 25,
    'minimax-m3': 65,
    'qwen3.8-max': 20,
    'qwen3.8-flash': 35,
    'qwen3.7-plus': 65,
    'hy4-preview': 35,
    hy3: 65,
    'grok-4.7': 20,
    'gpt-6-luna': 20,
    'gpt-5.6-luna': 20,
    'claude-haiku-5-5': 20,
    'gemini-4-argon': 35,
    'muse-spark-1.2-contributor': 65,
    'muse-spark-1.3-contributor': 65,
    'beam-free': Infinity,
    'iceman-contributor-free': Infinity,
  },
}

function dshHome() {
  const configured = process.env.DSH_HOME
  return configured !== undefined && configured.length > 0 ? configured : path.join(os.homedir(), '.dsh')
}

function normalize(config = {}) {
  const plan = typeof config.plan === 'string' && LIMITS[config.plan] !== undefined ? config.plan : 'go'
  return {
    plan,
    path: typeof config.path === 'string' && config.path.startsWith('/') ? config.path : '/opencode-usage',
    refreshSeconds: Number.isFinite(config.refreshSeconds) && config.refreshSeconds >= 5 ? config.refreshSeconds : 60,
    usageUrl: typeof config.usageUrl === 'string' ? config.usageUrl : 'https://opencode.ai/inference/go/v1/usage',
    modelsUrl: typeof config.modelsUrl === 'string' ? config.modelsUrl : 'https://opencode.ai/inference/go/v1/models',
    apiKeyRef: typeof config.apiKeyRef === 'string' ? config.apiKeyRef : 'OPENCODE_API_KEY',
    sessionsRoot: typeof config.sessionsRoot === 'string' ? config.sessionsRoot : path.join(dshHome(), 'sessions'),
    // The account pool lives in dsh-opencode-quota-router's state file: one
    // owner writes it, this dashboard only reads it, so both plugins always
    // describe the same set of accounts in the same priority order.
    accountsStatePath: typeof config.accountsStatePath === 'string'
      ? config.accountsStatePath
      : path.join(dshHome(), 'opencode-quota-router.json'),
    // Published in the price document's `currency` block so bili's panel can
    // show ¥ next to $; bili's own `billing.cnyPerUsd` still wins if set.
    cnyPerUsd: Number.isFinite(config.cnyPerUsd) && config.cnyPerUsd > 0 ? config.cnyPerUsd : undefined,
    // Off-peak on China's statutory holidays is DeepSeek's own API rule. OpenCode
    // Go charges peak on those days (anomalyco/opencode#53071: "Go pricing follows
    // our own schedule, not DeepSeek's holiday calendar"), so this stays off by
    // default — the dashboard is about the Go bill.
    holidayAware: config.holidayAware === true,
    // The subscription price and its monthly allowance can be overridden here,
    // so a plan change from OpenCode needs a config edit, not a patch: the
    // discount shown on the page is derived from these two numbers.
    planPriceUsd: Number.isFinite(config.planPriceUsd) && config.planPriceUsd > 0 ? config.planPriceUsd : undefined,
    planAllowanceUsd: Number.isFinite(config.planAllowanceUsd) && config.planAllowanceUsd > 0 ? config.planAllowanceUsd : undefined,
    limits: LIMITS[plan],
  }
}

/** The visible part of a stored secret: enough to tell two keys apart, never enough to use one. */
function maskKey(key) {
  if (typeof key !== 'string' || key.length === 0) return null
  if (key.length <= 12) return `${key.slice(0, 3)}…`
  return `${key.slice(0, 7)}…${key.slice(-4)}`
}

/**
 * The account pool managed by dsh-opencode-quota-router, in priority order.
 * A missing or unreadable state file degrades to the single reference this
 * plugin was configured with, so the dashboard keeps working on its own.
 */
function readPool(cfg) {
  try {
    const parsed = JSON.parse(fs.readFileSync(cfg.accountsStatePath, 'utf8'))
    const entries = Array.isArray(parsed?.accounts) ? parsed.accounts.filter((entry) => typeof entry?.id === 'string') : []
    if (entries.length > 0) {
      return {
        active: typeof parsed.active === 'string' ? parsed.active : entries[0].id,
        accounts: entries.map((entry) => ({
          id: entry.id,
          label: typeof entry.label === 'string' && entry.label.length > 0 ? entry.label : entry.id,
          keyRef: typeof entry.keyRef === 'string' && entry.keyRef.length > 0 ? entry.keyRef : cfg.apiKeyRef,
          enabled: entry.enabled !== false,
          inlineKey: typeof entry.key === 'string' && entry.key.length > 0 ? entry.key : undefined,
        })),
      }
    }
  } catch {
    /* no pool yet: fall through to the single configured reference */
  }
  return { active: 'default', accounts: [{ id: 'default', label: '默认账户', keyRef: cfg.apiKeyRef, enabled: true }] }
}

/** Is `at` a Chinese statutory holiday (Beijing date)? */
export function isChinaHoliday(at) {
  const beijing = new Date(new Date(at).getTime() + 8 * HOUR)
  const year = beijing.getUTCFullYear()
  const monthDay = `${String(beijing.getUTCMonth() + 1).padStart(2, '0')}-${String(beijing.getUTCDate()).padStart(2, '0')}`
  return HOLIDAYS[year]?.includes(monthDay) === true
}

/** DeepSeek peak hours double both price and allowance burn. */
export function peakMultiplier(model, at, holidayAware = false) {
  if (!PEAK.modelPrefixes.some((prefix) => model.startsWith(prefix))) return 1
  const date = new Date(at)
  const day = date.getUTCDay()
  if (day === 0 || day === 6) return 1
  if (holidayAware && isChinaHoliday(at)) return 1
  const hour = date.getUTCHours()
  return PEAK.utcWeekdayHours.some(([from, to]) => hour >= from && hour < to) ? PEAK.factor : 1
}

/** What each plan costs per month, in USD. The plan's allowance is metered at
 *  DeepSeek's list price, so the subscription buys its allowance at a fixed
 *  discount — Go pays $10 for $100 of list-priced usage, i.e. 10x. */
const PLAN_PRICES = { go: 10, 'go-plus': 40, 'go-teams': 20 }

/** The three lines DeepSeek bills on, in the order the page shows them: a cached
 *  prompt token is by far the cheapest, so it leads. */
export const BILLING_KINDS = ['cacheRead', 'input', 'output']

/** Which route is cheaper at this instant, expressed in the money you actually
 *  hand over: OpenCode charges the list price against a discounted allowance,
 *  while DeepSeek's API bills the list price directly.
 *
 *  `overrides` lets the settings page (or a future price change) replace the
 *  plan price and its allowance without touching this file: the discount is
 *  derived, so editing either number re-derives the verdict on its own. */
export function peakSnapshot(cnyPerUsd, at = Date.now(), plan = 'go', overrides = {}) {
  const fx = Number.isFinite(cnyPerUsd) && cnyPerUsd > 0 ? cnyPerUsd : OFFICIAL.defaultCnyPerUsd
  const priceUsd = Number.isFinite(overrides.priceUsd) && overrides.priceUsd > 0
    ? overrides.priceUsd
    : PLAN_PRICES[plan] ?? PLAN_PRICES.go
  const listed = LIMITS[plan]?.['deepseek-v4.1-flash'] ?? LIMITS.go['deepseek-v4.1-flash']
  const allowanceUsd = Number.isFinite(overrides.allowanceUsd) && overrides.allowanceUsd > 0
    ? overrides.allowanceUsd
    : listed
  const leverage = allowanceUsd / priceUsd
  const routes = []
  for (const [model, official] of Object.entries(OFFICIAL.prices)) {
    const goFactor = peakMultiplier(model, at, false)
    const officialFactor = peakMultiplier(model, at, true)
    const rows = BILLING_KINDS.map((kind) => {
      // One million tokens of this kind is the yardstick; output dominates a
      // coding bill, so the headline verdict still reads off the output line.
      const list = official[kind]
      const burn = list * goFactor // what the request subtracts from the allowance
      const goPay = burn / leverage // what it actually costs you, given the discount
      const officialPay = list * officialFactor
      return { kind, list, go: { factor: goFactor, burn, pay: goPay }, official: { factor: officialFactor, pay: officialPay }, cheaper: goPay <= officialPay ? 'go' : 'official', ratio: goPay / officialPay }
    })
    const headline = rows[rows.length - 1]
    routes.push({
      model,
      rows,
      list: headline.list,
      go: headline.go,
      official: headline.official,
      cheaper: headline.cheaper,
      ratio: headline.ratio,
    })
  }
  return {
    at,
    cnyPerUsd: fx,
    holiday: isChinaHoliday(at),
    plan: { id: plan, priceUsd, priceCny: priceUsd * fx, allowanceUsd, allowanceCny: allowanceUsd * fx, leverage, overridden: Boolean(overrides.priceUsd || overrides.allowanceUsd) },
    go: { peak: peakMultiplier('deepseek-v4.1-flash', at, false) === PEAK.factor },
    official: { peak: peakMultiplier('deepseek-v4.1-flash', at, true) === PEAK.factor },
    factor: PEAK.factor,
    kinds: BILLING_KINDS,
    models: routes,
  }
}

function costOf(record, price, holidayAware = false) {
  if (price === undefined) return undefined
  const factor = peakMultiplier(record.model, record.t, holidayAware)
  return ((record.input / MIB) * price.input + (record.output / MIB) * price.output + (record.cacheRead / MIB) * price.cacheRead) * factor
}

/** Decode every zstd frame in a concatenated `.jsonl.zstd` file. */
function decodeFrames(buffer) {
  const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
  const offsets = []
  let at = 0
  while (true) {
    const found = buffer.indexOf(magic, at)
    if (found < 0) break
    offsets.push(found)
    at = found + 4
  }
  let text = ''
  for (let index = 0; index < offsets.length; index += 1) {
    const end = index + 1 < offsets.length ? offsets[index + 1] : buffer.length
    try {
      text += zlib.zstdDecompressSync(buffer.subarray(offsets[index], end)).toString('utf8')
    } catch {
      /* a partial trailing frame is expected while a Session is writing */
    }
  }
  return text
}

export function apply(ctx, config = {}) {
  const cfg = normalize(config)
  const records = []
  const seen = new Set()
  const startedAt = Date.now()
  let usageSnapshot = null
  let usageError = null
  let accounts = []
  let catalog = []
  let catalogError = null
  let detectedPlan = undefined
  let impliedMonthly = undefined

  function record(sessionId, seq, message, usage, time) {
    const source = message?.source
    if (source === undefined || !String(source.provider ?? '').startsWith('opencode')) return
    const key = `${sessionId}:${seq}`
    if (seen.has(key)) return
    seen.add(key)
    records.push({
      t: Number.isFinite(time) ? time : Date.now(),
      model: String(source.model ?? 'unknown'),
      input: Number(usage.inputTokens ?? 0),
      output: Number(usage.outputTokens ?? 0),
      cacheRead: Number(usage.cacheReadTokens ?? 0),
    })
    if (records.length > 20000) records.splice(0, records.length - 20000)
  }

  // Backfill: this month's Session logs, plus the last eight days for the
  // rolling and weekly windows.
  function backfill() {
    const since = Date.now() - 40 * DAY
    let files = []
    try {
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) walk(full)
          else if (entry.name.endsWith('.jsonl.zstd')) files.push(full)
        }
      }
      walk(cfg.sessionsRoot)
    } catch {
      return
    }
    for (const file of files) {
      try {
        if (fs.statSync(file).mtimeMs < since) continue
        const text = decodeFrames(fs.readFileSync(file))
        const sessionId = path.basename(path.dirname(file))
        for (const line of text.split('\n')) {
          if (line.length === 0 || !line.includes('assistant/message')) continue
          let event
          try {
            event = JSON.parse(line)
          } catch {
            continue
          }
          if (event.type !== 'assistant/message') continue
          record(sessionId, event.seq, event.data?.message, event.data?.usage, event.time)
        }
      } catch {
        /* unreadable log: ignore */
      }
    }
  }

  backfill()

  const disposeEvent = ctx.on('session/event', (session, event) => {
    if (event?.type !== 'assistant/message') return
    record(session.id, event.seq, event.data?.message, event.data?.usage, event.time)
  })

  async function refreshCatalog(key) {
    try {
      const response = await fetch(cfg.modelsUrl, { headers: { authorization: `Bearer ${key}`, accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
      if (!response.ok) {
        catalogError = `model endpoint answered ${response.status}`
        return
      }
      const body = await response.json()
      catalog = Array.isArray(body?.data)
        ? body.data
            .filter((entry) => typeof entry?.id === 'string')
            .map((entry) => {
              // The endpoint advertises what each model accepts (modalities) and
              // how it can be driven (tools / reasoning), so the table can say
              // "image + video" instead of guessing from the model name.
              const kinds = new Set()
              for (const kind of Array.isArray(entry?.modalities?.input) ? entry.modalities.input : []) {
                const text = String(kind)
                if (text === 'text') kinds.add('text')
                else if (text.startsWith('image')) kinds.add('image')
                else if (text.startsWith('video')) kinds.add('video')
                else if (text.startsWith('audio')) kinds.add('audio')
                else if (text.includes('pdf')) kinds.add('pdf')
              }
              const caps = entry?.capabilities ?? {}
              const price = entry?.cost?.text
              return {
                id: entry.id,
                name: typeof entry.name === 'string' ? entry.name : entry.id,
                inputs: [...kinds],
                tools: caps?.tools?.supported === true,
                reasoning: caps?.reasoning?.supported === true,
                efforts: Array.isArray(caps?.reasoning?.effort) ? caps.reasoning.effort : [],
                context: typeof entry?.limit?.context === 'number' ? entry.limit.context : undefined,
                output: typeof entry?.limit?.output === 'number' ? entry.limit.output : undefined,
                free: price?.input?.price === 0 && price?.output?.price === 0,
              }
            })
        : []
      catalogError = null
    } catch (error) {
      catalogError = String(error?.message ?? error)
    }
  }

  async function keyFor(account) {
    const credentials = ctx.get('credentials')
    if (credentials !== undefined && typeof credentials.resolve === 'function') {
      try {
        const value = (await credentials.resolve(account.keyRef))?.value
        if (typeof value === 'string' && value.length > 0) return value
      } catch {
        /* a broken store must not hide the other accounts */
      }
    }
    if (account.inlineKey !== undefined) return account.inlineKey
    const ambient = process.env[account.keyRef]
    return typeof ambient === 'string' && ambient.length > 0 ? ambient : undefined
  }

  async function fetchUsage(key) {
    try {
      const response = await fetch(cfg.usageUrl, {
        headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) return { usage: null, error: `usage endpoint answered ${response.status}` }
      return { usage: (await response.json())?.usage ?? null, error: null }
    } catch (error) {
      return { usage: null, error: String(error?.message ?? error) }
    }
  }

  async function refreshSnapshot() {
    const pool = readPool(cfg)
    const viewed = []
    let catalogKey
    for (const account of pool.accounts) {
      const key = await keyFor(account)
      if (key === undefined) {
        viewed.push({
          id: account.id,
          label: account.label,
          keyRef: account.keyRef,
          enabled: account.enabled,
          active: account.id === pool.active,
          configured: false,
          hint: null,
          usage: null,
          usageError: `no credential for ${account.keyRef}`,
          checkedAt: Date.now(),
        })
        continue
      }
      catalogKey ??= key
      const { usage, error } = await fetchUsage(key)
      viewed.push({
        id: account.id,
        label: account.label,
        keyRef: account.keyRef,
        enabled: account.enabled,
        active: account.id === pool.active,
        configured: true,
        hint: maskKey(key),
        usage,
        usageError: error,
        checkedAt: Date.now(),
      })
    }
    if (catalogKey !== undefined) await refreshCatalog(catalogKey)
    accounts = viewed
    const active = viewed.find((entry) => entry.active) ?? viewed[0]
    usageSnapshot = active?.usage ?? null
    usageError = active?.usageError ?? null
  }
  void refreshSnapshot()

  function windowStart(name) {
    const now = Date.now()
    const reset = Date.parse(usageSnapshot?.[name]?.resetsAt ?? '')
    if (name === 'monthly') {
      const current = new Date(now)
      return Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), 1)
    }
    if (Number.isFinite(reset)) {
      const span = name === 'rolling' ? 5 * HOUR : 7 * DAY
      return Math.min(now, reset - span)
    }
    if (name === 'rolling') return now - 5 * HOUR
    return now - 7 * DAY
  }

  function view() {
    const starts = { rolling: windowStart('rolling'), weekly: windowStart('weekly'), monthly: windowStart('monthly') }
    const models = new Map()
    for (const record of records) {
      const entry = models.get(record.model) ?? {
        model: record.model,
        requests: 0,
        input: 0,
        output: 0,
        cacheRead: 0,
        rolling: 0,
        weekly: 0,
        monthly: 0,
        cost: 0,
        priced: PRICES[record.model] !== undefined,
      }
      entry.requests += 1
      entry.input += record.input
      entry.output += record.output
      entry.cacheRead += record.cacheRead
      const cost = costOf(record, PRICES[record.model], cfg.holidayAware)
      if (cost !== undefined) entry.cost += cost
      if (record.t >= starts.rolling) entry.rolling += cost ?? 0
      if (record.t >= starts.weekly) entry.weekly += cost ?? 0
      if (record.t >= starts.monthly) entry.monthly += cost ?? 0
      models.set(record.model, entry)
    }
    for (const entry of catalog) {
      if (models.has(entry.id)) continue
      models.set(entry.id, {
        model: entry.id,
        requests: 0,
        input: 0,
        output: 0,
        cacheRead: 0,
        rolling: 0,
        weekly: 0,
        monthly: 0,
        cost: 0,
        priced: PRICES[entry.id] !== undefined,
      })
    }
    const rollingTotal = [...models.values()].reduce((sum, entry) => sum + entry.rolling, 0)
    const top = [...models.values()].sort((left, right) => right.rolling - left.rolling)[0]
    const officialPercent = usageSnapshot?.rolling?.percent
    if (top !== undefined && top.rolling > 0 && Number.isFinite(officialPercent) && officialPercent >= 3 && top.rolling >= rollingTotal * 0.8) {
      impliedMonthly = top.rolling / (officialPercent / 100) / 0.2
      // Only a clear tier change is detectable: Go ($100) and Go Teams ($105)
      // sit 5% apart, well inside this estimate's noise, so the configured plan
      // stays authoritative unless the implied allowance is at least 1.5x it.
      const configuredLimit = LIMITS[cfg.plan][top.model]
      if (typeof configuredLimit === 'number') {
        const upgrade = ['go', 'go-plus'].find((plan) => {
          const limit = LIMITS[plan][top.model]
          return typeof limit === 'number' && limit >= configuredLimit * 1.5 && Math.abs(limit - impliedMonthly) / limit <= 0.25
        })
        if (upgrade !== undefined) detectedPlan = upgrade
      }
    }
    const effectiveLimits = LIMITS[detectedPlan ?? cfg.plan]
    const catalogInfo = new Map(catalog.map((entry) => [entry.id, entry]))
    const rows = [...models.values()]
      .map((entry) => {
        const limit = effectiveLimits[entry.model]
        const info = catalogInfo.get(entry.model)
        const free = limit === Infinity || info?.free === true
        const remaining = limit === undefined || limit === Infinity ? undefined : Math.max(0, limit - entry.monthly)
        return {
          ...entry,
          limit,
          remaining,
          free,
          name: info?.name,
          inputs: info?.inputs,
          tools: info?.tools,
          reasoning: info?.reasoning,
          context: info?.context,
          maxOutput: info?.output,
          rollingLimit: limit === undefined || limit === Infinity ? undefined : limit * 0.2,
          weeklyLimit: limit === undefined || limit === Infinity ? undefined : limit * 0.5,
        }
      })
      .sort((left, right) => right.monthly - left.monthly)
    return {
      plan: detectedPlan ?? cfg.plan,
      configuredPlan: cfg.plan,
      detectedPlan,
      impliedMonthly,
      catalogError,
      checkedAt: Date.now(),
      startedAt,
      windowStarts: starts,
      holidayAware: cfg.holidayAware,
      peak: peakSnapshot(cfg.cnyPerUsd, Date.now(), detectedPlan ?? cfg.plan, {
        priceUsd: cfg.planPriceUsd,
        allowanceUsd: cfg.planAllowanceUsd,
      }),
      usage: usageSnapshot,
      usageError,
      accounts,
      activeAccount: accounts.find((entry) => entry.active)?.id ?? accounts[0]?.id ?? null,
      models: rows,
      totals: {
        requests: rows.reduce((sum, row) => sum + row.requests, 0),
        cost: rows.reduce((sum, row) => sum + row.cost, 0),
        monthly: rows.reduce((sum, row) => sum + row.monthly, 0),
      },
    }
  }

  async function handler(request, response) {
    let refreshNow = false
    try {
      refreshNow = new URL(request.url ?? '/', 'http://localhost').searchParams.get('refresh') === '1'
    } catch {
      refreshNow = false
    }
    if (refreshNow) await refreshSnapshot()
    const data = view()
    if (request.url?.startsWith(`${cfg.path}.json`)) {
      const body = JSON.stringify(data, null, 2)
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      response.end(body)
      return
    }
  }

  /** The billing document consumed by bili's `billing.priceSource` — ONE price
   *  table, two surfaces (this dashboard and the proxy's cost ledger). Shape is
   *  documented in billion-context/src/price-source.ts; prices are $/Mtok at
   *  the off-peak rate, `peak` carries the doubling rule, and `currency` is the
   *  optional ¥ rate. */
  function priceDocument() {
    const models = {}
    for (const [id, price] of Object.entries(PRICES)) {
      // Free models are omitted on purpose: bili requires a positive input
      // anchor to price anything (a zero-price row would be rejected and take
      // the whole document with it), and a free model needs no price — the
      // proxy shows its tokens and bills nothing, which is the truth.
      if (!(price.input > 0)) continue
      models[id] = {
        input: price.input,
        output: price.output,
        cacheRead: price.cacheRead,
        ...(PEAK.modelPrefixes.some((prefix) => id.startsWith(prefix))
          ? {
            peak: {
              factor: PEAK.factor,
              utcWeekdayHours: PEAK.utcWeekdayHours,
              ...(cfg.holidayAware ? { chinaHolidays: HOLIDAYS } : {}),
            },
          }
          : {}),
      }
    }
    return {
      version: 1,
      source: 'opencode-usage',
      plan: cfg.plan,
      ...(cfg.cnyPerUsd === undefined ? {} : { currency: { cnyPerUsd: cfg.cnyPerUsd } }),
      models,
    }
  }

  function priceHandler(_request, response) {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(JSON.stringify(priceDocument(), null, 2))
  }

  const disposeJson = ctx.webServer.register({ kind: 'exact', path: `${cfg.path}.json`, handler })
  const disposePrices = ctx.webServer.register({ kind: 'exact', path: `${cfg.path}.prices.json`, handler: priceHandler })

  ctx.effect(() => () => {
    disposeJson()
    disposePrices()
    disposeEvent()
  }, 'opencode-usage: unregister data route')

  const timer = setInterval(() => void refreshSnapshot(), Math.max(60, Math.floor(cfg.refreshSeconds)) * 1000)
  timer.unref?.()
  ctx.effect(() => () => clearInterval(timer), 'opencode-usage: stop usage polling')

  ctx.logger.info(`opencode-usage: ${records.length} records from ${cfg.plan} plan; dashboard at ${cfg.path}`)
}
