/**
 * Local harness for the merged accounts plugin: one fake context per half, a
 * fake credential store, a local usage endpoint that answers per API key, and a
 * model catalog that advertises modalities, so account failover, per-model
 * quarantine, the Settings API, the per-account probe, and the capability
 * columns are all exercised without any model tokens.
 */
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import assert from 'node:assert/strict'

import * as accounts from './index.js'
import { apply as applyRouter, classifyNet, isExhausted, maskKey, nextProbeAt, retryAfter } from './router.js'
import { apply as applyUsage, isChinaHoliday, parseGoDocs, peakClock, peakMultiplier, peakSnapshot } from './usage.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wait until the router's own probe schedule stops moving the usage counters.
 * The suite runs it at a 1.2 s cadence, so a background round can otherwise land
 * between two assertions and inflate a count nobody asked for.
 */
async function quietProbes() {
  let last = -1
  for (let i = 0; i < 24; i += 1) {
    const total = [...probes.values()].reduce((sum, hits) => sum + hits, 0)
    if (total === last) return
    last = total
    await sleep(120)
  }
}

// ---- one package, two children -------------------------------------------
{
  assert.equal(accounts.name, 'opencode-router')
  assert.equal(accounts.maskKey('short'), 'sho…', 'helpers are re-exported')
  const mounted = []
  const meta = {
    plugin(spec, config) {
      mounted.push({ spec, config })
    },
  }
  accounts.apply(meta, {
    usageUrl: 'http://127.0.0.1:1/usage',
    usage: { path: '/u', plan: 'go' },
    router: { path: '/r', probeIntervalMs: 1000 },
  })
  assert.equal(mounted.length, 2)
  assert.deepEqual(mounted.map((entry) => entry.spec.name), ['opencode-router:usage', 'opencode-router:router'])
  assert.equal(mounted[0].config.path, '/u')
  assert.equal(mounted[0].config.plan, 'go')
  assert.equal(mounted[1].config.path, '/r')
  assert.equal(mounted[1].config.usageUrl, 'http://127.0.0.1:1/usage', 'top-level keys are shared')
  assert.equal('usage' in mounted[0].config, false, 'the sub-objects are consumed')
  assert.equal('router' in mounted[1].config, false)
}
console.log('composite plugin ok')

// ---- pure logic -----------------------------------------------------------
assert.equal(isExhausted({ rolling: { status: 'ok', percent: 42 } }), false)
assert.equal(isExhausted({ rolling: { status: 'ok', percent: 100 } }), true)
{
  const now = Date.parse('2026-10-31T12:00:00Z')
  assert.equal(nextProbeAt({ rolling: { resetsAt: new Date(now + 10 * 60_000).toISOString() } }, now, 30 * 60_000), now + 10 * 60_000 + 2000)
  assert.equal(retryAfter({ rolling: { percent: 100, resetsAt: new Date(now + 60_000).toISOString() } }, now, 1000), now + 62_000)
  assert.equal(maskKey('oc_sk_515adae389d8_0mTGYIu3_cGU'), 'oc_sk_5…_cGU')
}
{
  const holidayPeak = Date.parse('2026-02-17T02:00:00Z') // Beijing 10:00 on 初一
  const plainPeak = Date.parse('2026-02-24T02:00:00Z') // Beijing 10:00, an ordinary Tuesday
  assert.equal(isChinaHoliday(holidayPeak), true)
  assert.equal(isChinaHoliday(plainPeak), false)
  assert.equal(peakMultiplier('deepseek-v4.1-flash', holidayPeak), 2, 'OpenCode bills the holiday as peak')
  assert.equal(peakMultiplier('deepseek-v4.1-flash', holidayPeak, true), 1, 'the official API skips the holiday')
  assert.equal(peakMultiplier('glm-5.3', holidayPeak), 1, 'only DeepSeek models have peak hours')
  assert.equal(isChinaHoliday(Date.parse('2030-02-02T04:00:00Z')), true, '2030 除夕 is lunar 12/30')
  assert.equal(isChinaHoliday(Date.parse('2030-02-01T04:00:00Z')), false)

  const holiday = peakSnapshot(7.1, holidayPeak, 'go')
  assert.equal(holiday.plan.leverage, 10)
  assert.equal(holiday.plan.allowanceCny, 710)
  assert.equal(holiday.models.every((row) => row.cheaper === 'go'), true)
  const plain = peakSnapshot(7.1, plainPeak, 'go')
  assert.ok(Math.abs(plain.models[0].ratio - 0.1) < 0.001, 'both peak: exactly the 10x discount')

  // The page reports both calendars separately with a countdown to the flip.
  const clockHoliday = peakClock(holidayPeak)
  assert.equal(clockHoliday.holiday, true)
  assert.equal(clockHoliday.official.peak, false, 'the official API is off-peak on a holiday')
  assert.equal(clockHoliday.opencode.peak, true, 'OpenCode keeps billing the holiday as peak')
  assert.equal(typeof clockHoliday.opencode.hours, 'number')
  assert.ok(clockHoliday.opencode.hours > 0 && clockHoliday.opencode.hours <= 5, 'the window ends within 5 hours')

  const clockPlain = peakClock(plainPeak)
  assert.equal(clockPlain.official.peak, true)
  assert.equal(clockPlain.opencode.peak, true)
  assert.ok(clockPlain.opencode.hours >= 1.9 && clockPlain.opencode.hours <= 2.1, 'two hours left in the morning window')

  const clockQuiet = peakClock(Date.parse('2026-02-24T12:00:00Z')) // Beijing 20:00
  assert.equal(clockQuiet.official.peak, false)
  assert.equal(clockQuiet.opencode.peak, false)
  assert.ok(clockQuiet.opencode.hours > 0, 'a flip always lies ahead')

  // The client draws the day from these two fields, so the schedule and the
  // Beijing clock travel with the snapshot instead of being hardcoded again.
  assert.deepEqual(clockQuiet.rule, { factor: 2, utcWeekdayHours: [[1, 4], [6, 10]] }, 'the rule ships with the clock')
  assert.deepEqual(clockQuiet.beijing, { weekday: 2, hour: 20, minute: 0, minutes: 1200 }, 'and so does the Beijing wall clock')
  assert.equal(peakClock(Date.parse('2026-02-28T04:00:00Z')).beijing.weekday, 6, 'Saturday reads as day 6 (Beijing, not UTC)')

  // The pricing page is the only place the plan price and the per-model allowance
  // are published, so the scraper must survive the real markup.
  const docs = parseGoDocs(`
    <table><tbody>
      <tr><td><strong>Go</strong></td><td><strong>$10/month</strong></td><td>Lower-cost access</td></tr>
      <tr><td><strong>Go Plus</strong></td><td><strong>$40/month</strong></td><td>Higher limits</td></tr>
      <tr><td>DeepSeek V4.1 Flash (Off-Peak)</td><td>$0.15</td><td>$0.60</td><td>$0.003</td><td>-</td><td><strong>$100</strong></td></tr>
      <tr><td>DeepSeek V4.1 Flash (Peak)</td><td>$0.30</td><td>$1.20</td><td>$0.006</td><td>-</td><td><strong>$100</strong></td></tr>
      <tr><td>DeepSeek V4 Pro (Off-Peak)</td><td>$0.66</td><td>$1.98</td><td>$0.022</td><td>-</td><td><strong>$15</strong></td></tr>
    </tbody></table>`)
  assert.equal(docs.plans.go, 10)
  assert.equal(docs.plans['go-plus'], 40)
  assert.deepEqual(docs.models['deepseek-v4.1-flash'], { input: 0.15, output: 0.6, cacheRead: 0.003 })
  assert.equal(docs.limits['deepseek-v4.1-flash'], 100)
  assert.equal(docs.models['deepseek-v4-pro'].output, 1.98, 'the off-peak row wins over the peak row')

  // With live OpenCode prices the allowance burns at OpenCode's rate, converted to
  // CNY, so the ratio drifts slightly off the pure 10x: 0.60*7.1/10 / 4 ≈ 0.1065.
  const live = peakSnapshot(7.1, plainPeak, 'go', {
    prices: { 'deepseek-v4.1-flash': docs.models['deepseek-v4.1-flash'] },
  })
  const liveOutput = live.models[0].rows.find((row) => row.kind === 'output')
  assert.ok(Math.abs(liveOutput.ratio - 0.1065) < 0.002, `live ratio ${liveOutput.ratio}`)

  // Each model buys its own allowance: Pro's $15 on a $10 plan is 1.5x, not 10x,
  // so the discount has to be derived per model rather than from Flash's number.
  const perModel = peakSnapshot(7.1, plainPeak, 'go', { limits: { 'deepseek-v4.1-flash': 100, 'deepseek-v4-pro': 15 } })
  const pro = perModel.models.find((entry) => entry.model === 'deepseek-v4-pro')
  assert.equal(pro.leverage, 1.5)
  assert.ok(Math.abs(pro.ratio - 2 / 3) < 0.001, `Pro ratio ${pro.ratio}`)
  assert.equal(pro.cheaper, 'go', 'OpenCode is still cheaper on Pro, just less so')
}
console.log('pure logic ok')

// ---- shared fixtures ------------------------------------------------------
/** API keys whose plan-wide window is spent. */
const exhaustedKeys = new Set()
/** How many usage requests each key produced, so a targeted probe is visible. */
const probes = new Map()
/** The published status feed the fake server answers with, and its hit count. */
let statusFetches = 0
const statusFeed = { status: 200, body: {} }
const server = http.createServer((request, response) => {
  if (request.url === '/status') {
    statusFetches += 1
    response.writeHead(statusFeed.status, { 'content-type': 'application/json' })
    response.end(JSON.stringify(typeof statusFeed.body === 'string' ? statusFeed.body : statusFeed.body))
    return
  }
  if (request.url === '/models') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      data: [
        {
          id: 'deepseek-v4.1-flash',
          name: 'DeepSeek V4.1 Flash',
          modalities: { input: ['text', 'image/jpeg', 'image/png'] },
          capabilities: { tools: { supported: true }, reasoning: { supported: true, effort: ['low', 'high'] } },
          limit: { context: 1_000_000, output: 384_000 },
          cost: { text: { input: { price: 0.15 }, output: { price: 0.6 } } },
        },
        {
          id: 'beam-free',
          name: 'Beam Free',
          modalities: { input: ['text', 'video/mp4'] },
          capabilities: { tools: { supported: false }, reasoning: { supported: false } },
          limit: { context: 1_048_576, output: 131_072 },
          cost: { text: { input: { price: 0 }, output: { price: 0 } } },
        },
      ],
    }))
    return
  }
  if (request.url !== '/usage') return response.writeHead(404).end()
  const key = String(request.headers.authorization ?? '').replace(/^Bearer /, '')
  probes.set(key, (probes.get(key) ?? 0) + 1)
  const exhausted = exhaustedKeys.has(key)
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify({
    usage: {
      rolling: { status: exhausted ? 'limited' : 'ok', percent: exhausted ? 100 : key === 'oc_sk_a' ? 100 : 12.5, resetsAt: new Date(Date.now() + 3_600_000).toISOString() },
      weekly: { status: 'ok', percent: 4, resetsAt: new Date(Date.now() + 86_400_000).toISOString() },
      monthly: { status: 'ok', percent: 9, resetsAt: new Date(Date.now() + 2_592_000_000).toISOString() },
    },
  }))
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const usageUrl = `${base}/usage`

// A trimmed copy of status.opencode.ai/api/status: one plan degraded for an
// upstream reason, one model fine, one incident still open, one resolved.
const feedDegraded = () => ({
  updatedAt: Date.now(),
  since: Date.now() - 4 * 3600_000,
  stale: false,
  status: 'degraded',
  components: [
    { service: 'console', status: 'operational', reason: 'none', since: 0, models: [], breakdown: [] },
    { service: 'inference', status: 'operational', reason: 'none', since: 0, models: [], breakdown: [] },
    {
      service: 'go',
      status: 'degraded',
      reason: 'upstream',
      since: Date.now() - 3600_000,
      models: [{ id: 'deepseek-v4.1-flash', reason: 'upstream' }],
      breakdown: [
        { id: 'deepseek-v4.1-flash', status: 'degraded', reason: 'upstream', speed: { ttft: 2857, tps: 113 } },
        { id: 'deepseek-v4-pro', status: 'operational', reason: 'none', speed: { ttft: 1500, tps: 200 } },
      ],
    },
    { service: 'payg', status: 'operational', reason: 'none', since: 0, models: [], breakdown: [] },
  ],
  incidents: [
    { id: 'go-1', service: 'go', status: 'degraded', reason: 'upstream', startedAt: Date.now() - 3600_000, models: [{ id: 'deepseek-v4.1-flash', reason: 'upstream' }] },
    { id: 'payg-old', service: 'payg', status: 'degraded', reason: 'upstream', startedAt: Date.now() - 7200_000, resolvedAt: Date.now() - 7000_000, models: [] },
  ],
  notes: [],
  history: [],
})
// The same feed after OpenCode calls it fixed.
const feedHealthy = () => ({
  updatedAt: Date.now(),
  since: Date.now() - 60_000,
  stale: false,
  status: 'operational',
  components: [
    { service: 'console', status: 'operational', reason: 'none', since: 0, models: [], breakdown: [] },
    { service: 'inference', status: 'operational', reason: 'none', since: 0, models: [], breakdown: [] },
    {
      service: 'go',
      status: 'operational',
      reason: 'none',
      since: Date.now() - 60_000,
      models: [],
      breakdown: [
        { id: 'deepseek-v4.1-flash', status: 'operational', reason: 'none', speed: { ttft: 1200, tps: 260 } },
        { id: 'deepseek-v4-pro', status: 'operational', reason: 'none', speed: { ttft: 1500, tps: 200 } },
      ],
    },
    { service: 'payg', status: 'operational', reason: 'none', since: 0, models: [], breakdown: [] },
  ],
  incidents: [],
  notes: [],
  history: [],
})
statusFeed.body = feedDegraded()

const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'accounts-'))
const sessionsRoot = path.join(workdir, 'sessions')
fs.mkdirSync(sessionsRoot, { recursive: true })
const statePath = path.join(workdir, 'opencode-quota-router.json')

/** The fake credential store: the router writes here, the provider reads here. */
const store = new Map([['OPENCODE_API_KEY', 'oc_sk_test']])
const credentials = {
  resolve: async (ref) => (store.has(ref) ? { value: store.get(ref), source: 'file' } : undefined),
  describe: async (ref) => ({ configured: store.has(ref), writable: true }),
  set: async (ref, value) => {
    if (typeof value !== 'string' || value.length === 0) throw new Error('empty value')
    store.set(ref, value)
  },
  unset: async (ref) => {
    store.delete(ref)
  },
}

const listeners = new Map()
const disposers = []
const apiRoutes = new Map()
const scopeEffect = (factory) => {
  const dispose = factory()
  if (typeof dispose === 'function') disposers.push(dispose)
}
// The router now routes the actual streaming call. `llm.stream` re-enters the
// registered `llm/stream` waterfall, just like the real LLM service does.
let primaryFailure
let partialFailure
const adapterStream = (options) => (async function* () {
  if (primaryFailure !== undefined && options.provider === 'opencode-go' && options.model === primaryFailure.model) {
    const failure = primaryFailure.failure
    primaryFailure = undefined
    yield { type: 'finish', reason: { kind: 'error', failure } }
    return
  }
  // A limit that only shows up once tokens are already flowing: the step cannot
  // be retried under the caller, but the plan still has to move.
  if (partialFailure !== undefined && options.provider === 'opencode-go' && options.model === partialFailure.model) {
    const failure = partialFailure.failure
    partialFailure = undefined
    yield { type: 'text-delta', index: 0, text: 'half-answer ' }
    yield { type: 'finish', reason: { kind: 'error', failure } }
    return
  }
  yield { type: 'text-delta', index: 0, text: `${options.provider}/${options.model}` }
  yield { type: 'finish', reason: { kind: 'stop' } }
})()
const llm = {
  listProviders: () => [{ id: 'opencode-go' }, { id: 'deepseek-account' }, { id: 'opencode-free' }],
  resolveModelInfo: async (provider, model) => ({
    reasoning: {
      efforts: provider === 'opencode-go' ? [{ id: 'low' }, { id: 'high' }, { id: 'max' }] : [{ id: 'off' }, { id: 'low' }],
    },
  }),
  stream: (options) => {
    const listener = listeners.get('llm/stream')
    return listener === undefined ? adapterStream(options) : listener(options, () => adapterStream(options))
  },
}
const on = (event, listener) => {
  listeners.set(event, listener)
  return () => listeners.delete(event)
}

// ---- router half ----------------------------------------------------------
const routes = [
  { primary: { provider: 'opencode-go', model: 'deepseek-v4.1-flash' }, fallback: { provider: 'deepseek-account', model: 'deepseek-flash' } },
  { primary: { provider: 'opencode-go', model: 'deepseek-v4-pro' }, fallback: { provider: 'deepseek-account', model: 'deepseek-v4-pro' } },
]
applyRouter({
  logger: { info: () => {}, warn: () => {} },
  get: (name) => (name === 'credentials' ? credentials : undefined),
  on,
  effect: scopeEffect,
  inject: (_deps, callback) => {
    callback({
      webServer: {
        register: ({ path: route, handler }) => {
          apiRoutes.set(route, handler)
          return () => apiRoutes.delete(route)
        },
      },
      effect: scopeEffect,
    })
  },
  llm,
}, { routes, usageUrl, statusUrl: `${base}/status`, statusRefreshMs: 15_000, statePath, probeIntervalMs: 1200, minProbeDelayMs: 1000, unconfirmedDelayMs: 1000, modelQuarantineMs: 2500, fallbackOnCapacity: true, capacityFallbackDelayMs: 60000, recoveryProbeIntervalMs: 400, recoverStableMs: 1500 })

const readState = () => JSON.parse(fs.readFileSync(statePath, 'utf8'))
const flash = { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'off' }
const pro = { provider: 'deepseek-account', model: 'deepseek-v4-pro', reasoningEffort: 'low' }

/** Run one request through the router and report the model its adapter stream saw. */
async function call(config) {
  const options = { ...config, messages: [], signal: new AbortController().signal }
  let result = ''
  for await (const chunk of llm.stream(options)) {
    if (chunk.type === 'text-delta') result += chunk.text
    else if (chunk.type === 'finish' && chunk.reason.kind === 'error') result += `error:${chunk.reason.failure.code}`
  }
  return result
}

/** Make the next adapter attempt for one primary model fail once. */
const failNext = (model, failure) => {
  primaryFailure = { model, failure }
}

/** Same, but only after the first token has already been handed to the caller. */
const failAfterFirstToken = (model, failure) => {
  partialFailure = { model, failure }
}

/** Drive the Settings API over the fake webserver. */
async function api(method, payload) {
  const handler = apiRoutes.get('/opencode-quota-router.json')
  assert.ok(handler, 'the Settings API is registered')
  const request = Object.assign(Readable.from(payload === undefined ? [] : [Buffer.from(JSON.stringify(payload))]), { method })
  const response = {
    status: 0,
    writeHead(status) {
      this.status = status
    },
    end(text) {
      this.resolve({ status: this.status, body: JSON.parse(text) })
    },
  }
  const done = new Promise((resolve) => {
    response.resolve = resolve
  })
  handler(request, response)
  return done
}

await sleep(1800)
assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash')
{
  const state = readState()
  assert.equal(state.version, 4)
  assert.equal(state.accounts.length, 1, 'the configured key is adopted as the first account')
  assert.equal(state.accounts[0].keyRef, 'OPENCODE_API_KEY_A1')
  assert.equal(store.get('OPENCODE_API_KEY_A1'), 'oc_sk_test')
}
console.log('router startup ok')

// per-model quarantine keeps the plan for the other models
failNext('deepseek-v4-pro', { code: 'QUOTA', status: 429, message: 'usage limit reached' })
{
  assert.equal(await call(pro), 'deepseek-account/deepseek-v4-pro', 'the spent primary model falls back')
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash', 'Flash keeps the plan while Pro is quarantined')
  assert.equal(readState().mode, 'primary')
}
await sleep(3200)
assert.equal(await call(pro), 'opencode-go/deepseek-v4-pro')
console.log('per-model quarantine ok')

// A spent account hands over to the backup
{
  const added = await api('POST', { action: 'add', label: '账户 B', key: 'oc_sk_backup' })
  assert.equal(added.status, 200)
  assert.equal(added.body.accounts[1].keyRef, 'OPENCODE_API_KEY_A2')
  assert.equal(store.get('OPENCODE_API_KEY_A2'), 'oc_sk_backup')
  assert.equal(JSON.stringify(added.body).includes('oc_sk_backup'), false, 'the snapshot never carries a plaintext key')
}
exhaustedKeys.add('oc_sk_test')
failNext('deepseek-v4.1-flash', { code: 'QUOTA', status: 429, message: 'usage limit reached' })
{
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash', 'the retried request uses the backup account')
  const state = readState()
  assert.equal(state.active, 'a2', 'the spent account hands over to the backup')
  assert.equal(state.mode, 'primary', 'an account failover is not a plan-wide fallback')
  assert.equal(store.get('OPENCODE_API_KEY'), 'oc_sk_backup', 'the active key is mirrored into the provider reference')
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash')
}
console.log('account failover ok')

// A target probe only touches the named account
{
  // The router keeps probing on its own schedule, so start from a quiet moment
  // and then compare what each call added rather than an absolute total.
  await quietProbes()
  probes.clear()
  const probed = await api('POST', { action: 'probe', id: 'a1' })
  assert.equal(probed.status, 200)
  assert.equal(probes.get('oc_sk_test'), 1, 'the idle account was probed')
  assert.equal(probes.get('oc_sk_backup') ?? 0, 0, 'the other account was left alone')
  const all = await api('POST', { action: 'probe' })
  assert.equal(all.status, 200)
  assert.ok(probes.get('oc_sk_test') >= 2, 'the whole-pool probe re-reads the named account')
  assert.ok((probes.get('oc_sk_backup') ?? 0) >= 1, 'and it reads the backup too')
  const unknown = await api('POST', { action: 'probe', id: 'zzz' })
  assert.equal(unknown.status, 400, 'a probe for an unknown account is rejected')
  assert.match(unknown.body.error, /zzz/)
}
console.log('targeted probe ok')

// Every account spent is a plan-wide fallback, and Settings can reset it
exhaustedKeys.add('oc_sk_backup')
failNext('deepseek-v4.1-flash', { code: 'QUOTA', status: 429, message: 'usage limit reached' })
{
  assert.equal(await call(flash), 'deepseek-account/deepseek-flash', 'the failed request continues on the fallback route')
  assert.equal(readState().mode, 'fallback', 'no usable account left: every primary model falls back')
  const reset = await api('POST', { action: 'reset' })
  assert.equal(reset.body.mode, 'primary')
  // Nothing is quarantined after a reset, but the periodic probe still has a
  // next run: the page must show a time instead of a dash.
  assert.equal(typeof reset.body.nextProbeAt, 'number', 'nextProbeAt is a timestamp, not null')
  assert.ok(reset.body.nextProbeAt > Date.now(), 'nextProbeAt is in the future')
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash')
}
console.log('plan-wide fallback ok')

exhaustedKeys.clear()

// Capacity/overload refusals fall back even while the allowance is intact.
failNext('deepseek-v4.1-flash', {
  code: 'RATE_LIMIT',
  status: 429,
  message: 'Upstream request failed: [prefill_cap_refused] the cell is at capacity; retry shortly (after 30 s)',
})
{
  assert.equal(await call(flash), 'deepseek-account/deepseek-flash', 'a capacity refusal falls back instead of burning the retry budget')
  assert.equal(readState().mode, 'fallback', 'the plan-wide fallback is armed')
  const primary = await api('POST', { action: 'primary' })
  assert.equal(primary.status, 200)
  assert.equal(primary.body.mode, 'primary')
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash')
}
console.log('capacity fallback ok')

// Manual switch actions for the Settings page.
{
  const forced = await api('POST', { action: 'fallback' })
  assert.equal(forced.status, 200)
  assert.equal(forced.body.mode, 'fallback')
  assert.equal(await call(flash), 'deepseek-account/deepseek-flash')
  const back = await api('POST', { action: 'primary' })
  assert.equal(back.status, 200)
  assert.equal(back.body.mode, 'primary')
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash')
}
console.log('manual fallback ok')

assert.equal(await call({ provider: 'other', model: 'x' }), 'other/x', 'other providers are never claimed')
failNext('deepseek-v4.1-flash', { code: 'RATE_LIMIT', status: 429, message: 'slow down' })
assert.equal(await call(flash), 'error:RATE_LIMIT', 'a plain rate limit stays with the provider')
console.log('delegation ok')

// The status card names the condition and keeps the upstream's own wording.
{
  const view = await api('GET')
  assert.equal(view.status, 200)
  assert.equal(view.body.upstream.state, 'degraded', 'a recent failure degrades the badge')
  assert.equal(view.body.upstream.code, 'rate_limit', '429 is classified as a rate limit')
  assert.equal(view.body.upstream.windowMs, 30 * 60_000)
  const row = view.body.upstream.models.find((entry) => entry.model === 'deepseek-v4.1-flash')
  assert.equal(row.code, 'rate_limit')
  assert.equal(row.lastHttpStatus, 429)
  assert.equal(row.lastMessage, 'slow down', 'the raw message is kept for the tooltip')
  assert.ok(row.recentFails >= 1)
  assert.equal('failRateLimitHint' in view.body, false, 'the copy lives in the client, not the payload')
}
console.log('status classification ok')

// OpenCode publishes the same verdict itself; the snapshot carries it verbatim.
{
  const view = await api('GET')
  assert.equal(view.body.official.ok, true)
  assert.equal(view.body.official.status, 'degraded')
  assert.equal(view.body.official.stale, false)
  assert.deepEqual(view.body.official.services.map((entry) => entry.id), ['inference', 'go', 'payg'], 'console and logs are not inference')
  const degraded = view.body.official.models.find((entry) => entry.model === 'deepseek-v4.1-flash')
  assert.equal(degraded.status, 'degraded')
  assert.equal(degraded.reason, 'upstream', 'the reason travels with the row')
  assert.equal(degraded.ttftMs, 2857)
  assert.equal(degraded.tps, 113)
  const fine = view.body.official.models.find((entry) => entry.model === 'deepseek-v4-pro')
  assert.equal(fine.status, 'operational')
  assert.equal(view.body.official.active.length, 1, 'resolved incidents are not listed as active')
  assert.equal(view.body.official.active[0].id, 'go-1')

  const before = statusFetches
  const refreshed = await api('POST', { action: 'status' })
  assert.ok(statusFetches > before, 'the refresh button re-reads the published feed')
  assert.equal(refreshed.body.official.status, 'degraded')

  // A broken feed costs freshness, never routing.
  statusFeed.status = 500
  statusFeed.body = ''
  const broken = await api('POST', { action: 'status' })
  assert.equal(broken.status, 200)
  assert.equal(broken.body.official.ok, false)
  assert.match(broken.body.official.error, /HTTP 500/)
  assert.equal(broken.body.official.status, 'degraded', 'the last good reading stays on the card')
  statusFeed.status = 200
  statusFeed.body = feedDegraded()
  const back = await api('POST', { action: 'status' })
  assert.equal(back.body.official.ok, true, 'a recovered feed clears the error')
  assert.equal(back.body.official.error, null)
}
console.log('official status ok')

// A fallback is only undone once the stability window has passed, never after
// the first clean probe — otherwise a flapping upstream switches back and forth.
{
  const forced = await api('POST', { action: 'fallback' })
  assert.equal(forced.body.mode, 'fallback')
  assert.equal(forced.body.upstream.state, 'fallback')
  assert.equal(forced.body.upstream.cause, 'manual')
  assert.equal(await call(flash), 'deepseek-account/deepseek-flash', 'the task continues on the official route')

  // Probes answer cleanly, but OpenCode still publishes our model as degraded:
  // the window must not even start, or the router walks straight back into it.
  const blocked = await api('POST', { action: 'status' })
  assert.equal(blocked.body.mode, 'fallback', 'a degraded feed keeps the fallback')
  assert.equal(blocked.body.upstream.state, 'fallback')
  assert.equal(blocked.body.upstream.recovery.blocked, 'published')
  assert.equal(blocked.body.upstream.recovery.stableSince, 0)
  assert.equal(blocked.body.official.status, 'degraded')

  statusFeed.body = feedHealthy()
  const first = await api('POST', { action: 'status' })
  assert.equal(first.body.mode, 'fallback', 'one clean probe does not switch back')
  assert.equal(first.body.upstream.state, 'recovering')
  assert.equal(first.body.upstream.recovery.active, true)
  assert.equal(first.body.upstream.recovery.blocked, null, 'a healthy feed releases the window')
  assert.ok(first.body.upstream.recovery.remainingMs > 0, 'the window is still counting')

  await sleep(700)
  const mid = await api('POST', { action: 'status' })
  assert.equal(mid.body.mode, 'fallback', 'still inside the window')
  assert.ok(mid.body.upstream.recovery.remainingMs < first.body.upstream.recovery.remainingMs, 'the countdown shrinks')

  await sleep(900)
  const back = await api('POST', { action: 'status' })
  assert.equal(back.body.mode, 'primary', 'a full stability window hands the traffic back')
  assert.match(back.body.reason, /^stable for /)
  assert.equal(back.body.upstream.state, 'healthy', 'the recovery clears the degraded verdict')
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash', 'the agent keeps working on OpenCode')
}
console.log('recovery window ok')

// A limit that lands mid-step: the tokens already went to the caller, so the
// step cannot be replayed — but the plan still moves, and the step retry lands
// on the official subscription instead of walking into the same wall.
{
  failAfterFirstToken('deepseek-v4.1-flash', {
    code: 'RATE_LIMIT',
    status: 429,
    message: 'Upstream request failed: [prefill_cap_refused] the cell is at capacity',
  })
  assert.equal(await call(flash), 'half-answer error:RATE_LIMIT', 'the partial answer fails through to the caller')
  assert.equal(readState().mode, 'fallback', 'the plan moves even though the step could not be retried in place')
  assert.equal(await call(flash), 'deepseek-account/deepseek-flash', 'the retried step continues on the official subscription')

  const primary = await api('POST', { action: 'primary' })
  assert.equal(primary.body.mode, 'primary', 'Settings can hand the traffic back')
  assert.equal(await call(flash), 'opencode-go/deepseek-v4.1-flash')
}
console.log('mid-step failure ok')


// ---- usage half -----------------------------------------------------------
let handler
applyUsage({
  logger: { info: () => {}, warn: () => {} },
  get: (name) => (name === 'credentials' ? credentials : undefined),
  on,
  effect: scopeEffect,
  webServer: {
    register: ({ path: route, handler: registered }) => {
      if (route === '/opencode-usage.json') handler = registered
      return () => {}
    },
  },
}, {
  plan: 'go',
  path: '/opencode-usage',
  usageUrl,
  modelsUrl: `${base}/models`,
  sessionsRoot,
  accountsStatePath: statePath,
  refreshSeconds: 3600,
  // Tests never touch the network for prices: the built-in table keeps the
  // arithmetic deterministic, and the scraper has its own fixture below.
  pricingSync: false,
})

const request = async (query = '') => {
  const response = {
    status: 0,
    writeHead(status) {
      this.status = status
    },
    end(text) {
      this.resolve(JSON.parse(text))
    },
  }
  const done = new Promise((resolve) => {
    response.resolve = resolve
  })
  handler({ url: `/opencode-usage.json${query}` }, response)
  return done
}

await sleep(300)
{
  const data = await request('?refresh=1')
  assert.equal(data.accounts.length, 2, 'every account in the pool is reported')
  assert.equal(data.activeAccount, 'a2')
  assert.equal(JSON.stringify(data).includes('oc_sk_'), false, 'no plaintext key leaves the host')
  assert.equal(data.accounts[0].usage.rolling.percent, 12.5)

  const flashRow = data.models.find((row) => row.model === 'deepseek-v4.1-flash')
  assert.deepEqual(flashRow.inputs, ['text', 'image'], 'modalities become capability tags')
  assert.equal(flashRow.tools, true)
  assert.equal(flashRow.reasoning, true)
  assert.equal(flashRow.context, 1_000_000)
  assert.equal(flashRow.maxOutput, 384_000)

  const freeRow = data.models.find((row) => row.model === 'beam-free')
  assert.equal(freeRow.free, true, 'a zero-price catalog entry is free')
  assert.equal(freeRow.remaining, undefined, 'free models have no remaining quota')
  assert.equal(freeRow.inputs.includes('video'), true)
  assert.equal(data.peak.plan.leverage, 10)

  // Every model breaks down into the three lines DeepSeek bills on, cheapest first
  const peakFlash = data.peak.models.find((entry) => entry.model === 'deepseek-v4.1-flash')
  assert.deepEqual(peakFlash.rows.map((line) => line.kind), ['cacheRead', 'input', 'output'])
  assert.equal(peakFlash.rows[0].cheaper, 'go', 'the cached line is still cheaper on OpenCode')
  assert.equal(Math.round(peakFlash.rows[0].ratio * 100) / 100, 0.1)
}

// A plan change is a config edit, not a code change: the discount is derived
{
  const offPeak = Date.UTC(2026, 10, 3, 16, 0)
  const cheaper = peakSnapshot(7.1, offPeak, 'go', { priceUsd: 10, allowanceUsd: 50 })
  assert.equal(cheaper.plan.leverage, 5, 'a smaller allowance halves the discount')
  assert.equal(cheaper.plan.overridden, true)
  const dearer = peakSnapshot(7.1, offPeak, 'go', { priceUsd: 50, allowanceUsd: 100 })
  assert.equal(dearer.plan.leverage, 2)
  assert.equal(dearer.models[0].rows[0].cheaper, 'go', 'still cheaper, just less so')
}
console.log('usage view ok')

// A missing pool file degrades to the single configured reference
{
  fs.rmSync(statePath)
  const data = await request('?refresh=1')
  assert.equal(data.accounts.length, 1)
  assert.equal(data.accounts[0].keyRef, 'OPENCODE_API_KEY')
}
console.log('single-account fallback ok')

// "Edit key" pre-fills from the stored value; the snapshot never carries it
{
  const reveal = async (query) => {
    const handler = apiRoutes.get('/opencode-quota-router.json')
    const response = {
      status: 0,
      body: undefined,
      writeHead(status) {
        this.status = status
      },
      end(chunk) {
        this.body = JSON.parse(chunk)
      },
    }
    await handler({ method: 'GET', url: `/opencode-quota-router.json${query}` }, response)
    return response
  }

  const hit = await reveal('?key=a1')
  assert.equal(hit.status, 200)
  assert.equal(hit.body.key, 'oc_sk_test', 'the stored key comes back for the editor')

  const missing = await reveal('?key=zzz')
  assert.equal(missing.status, 400, 'an unknown account is rejected')
  assert.match(missing.body.error, /zzz/)

  const snapshot = await api('GET')
  assert.equal(JSON.stringify(snapshot.body).includes('oc_sk_test'), false, 'the snapshot stays masked')
}
console.log('reveal key ok')

// The Settings page and the frame notice are createElement trees, so a stand-in
// React renders them with no browser and no network: hooks hand back a seeded
// value, effects never run, and the tree is flattened back to text. This is what
// keeps "one status card, one refresh button, a banner that names the route" from
// silently regressing into the two-card layout it replaced.
{
  const source = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8')

  /** Load client.js against a stand-in React and return the registered slots. */
  const load = (seed) => {
    const React = {
      createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
      Fragment: 'Fragment',
      useState: (init) => {
        const value = typeof init === 'function' ? init() : init
        const replaced = seed === undefined ? undefined : seed(value)
        return [replaced === undefined ? value : replaced, () => {}]
      },
      useRef: (value) => ({ current: value ?? null }),
      useEffect: () => {},
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn(),
      useLayoutEffect: () => {},
    }
    const requireFake = (name) => {
      if (name === 'react') return React
      throw new Error(`client asked for an unexpected module: ${name}`)
    }
    const registered = new Map()
    const previous = globalThis.window
    let definition
    globalThis.window = { __ModuleLoader__: { load: (entry) => { definition = entry } } }
    try {
      new Function('window', 'require', source)(globalThis.window, requireFake)
      assert.equal(definition.id, 'dsh-opencode-routing')
      definition.factory(requireFake).apply({
        slots: {
          inject: (name, factory) => factory(),
          register: (registration, component) => {
            registered.set(registration.id, component)
            return () => {}
          },
        },
      })
    } finally {
      if (previous === undefined) delete globalThis.window
      else globalThis.window = previous
    }
    return registered
  }

  /** Every string a tree renders, tooltips included. */
  const strings = (node, out = []) => {
    if (node === null || node === undefined || node === false) return out
    if (Array.isArray(node)) {
      for (const child of node) strings(child, out)
      return out
    }
    if (typeof node !== 'object') {
      out.push(String(node))
      return out
    }
    for (const value of [node.props?.title, node.props?.placeholder]) {
      if (typeof value === 'string') out.push(value)
    }
    for (const child of node.children ?? []) strings(child, out)
    return out
  }
  const flatten = (node) => strings(node).join(' ').replace(/\s+/g, ' ')
  const count = (haystack, needle) => haystack.split(needle).length - 1
  /** A node's own visible text, tooltips excluded. */
  const label = (node) => {
    if (node === null || node === undefined || node === false) return ''
    if (Array.isArray(node)) return node.map(label).join('')
    if (typeof node !== 'object') return String(node)
    return (node.children ?? []).map(label).join('')
  }
  /** Buttons whose visible label is exactly `text`. */
  const buttons = (node, text, out = []) => {
    if (Array.isArray(node)) {
      for (const child of node) buttons(child, text, out)
      return out
    }
    if (node === null || node === undefined || typeof node !== 'object') return out
    if (node.type === 'button' && label(node).trim() === text) out.push(node)
    for (const child of node.children ?? []) buttons(child, text, out)
    return out
  }

  const usage = await request('?refresh=1')
  const snapshot = await api('GET')
  assert.equal(snapshot.status, 200)
  assert.ok(snapshot.body.upstream && snapshot.body.official, 'the snapshot carries both halves')

  const routeOf = { primary: 'OpenCode 账户池', fallback: 'DeepSeek 官方订阅' }
  for (const mode of ['primary', 'fallback']) {
    const router = {
      ...snapshot.body,
      mode,
      reason: mode === 'fallback' ? 'OpenCode quota exhausted' : 'allowance recovered',
    }
    const registered = load((value) => (value && typeof value === 'object' && 'phase' in value
      ? { phase: 'ready', usage, router, error: null }
      : undefined))
    const page = registered.get('opencode-router')
    assert.equal(typeof page, 'function', 'the settings section registers under its id')
    const tree = page()
    const flat = flatten(tree)

    const nodes = []
    const walk = (node) => {
      if (Array.isArray(node)) {
        for (const child of node) walk(child)
        return
      }
      if (node === null || node === undefined || typeof node !== 'object') return
      nodes.push(node)
      for (const child of node.children ?? []) walk(child)
    }
    walk(tree)

    // The first thing on the page answers the two questions that matter — which
    // route is serving, and is this hour peak — and answers both in one card.
    const headline = nodes.find((node) => node.props?.style?.fontSize === 13.5 && node.props?.style?.fontWeight === 700)
    assert.ok(headline, 'the page opens with the route headline')
    assert.equal(label(headline), routeOf[mode], 'the headline names the route that is answering')
    assert.equal(headline.props.style.color, mode === 'fallback' ? '#e0a030' : '#3c9d5d', 'and colours it by route')
    assert.ok(flat.indexOf('当前路由') < flat.indexOf('本地上游探测'), 'the route sits above the status card')

    // Peak/off-peak is spelled out on the first screen, with the windows printed
    // under it — the old page hid it inside a collapsed price block. The countdown
    // follows whichever side is answering, so switching routes moves the number.
    const activeClock = mode === 'fallback' ? usage.clock?.official : usage.clock?.opencode
    const hot = activeClock?.peak === true
    const periodLabel = hot ? '高峰期' : '低谷期'
    const period = nodes.find((node) => node.props?.style?.fontSize === 17 && node.props?.style?.fontWeight === 700)
    assert.ok(period, 'the peak headline renders')
    assert.equal(label(period), periodLabel, 'and names the current period')
    assert.equal(period.props.style.color, hot ? '#e0a030' : '#3c9d5d', 'amber when it bills 2x, green when it does not')
    assert.ok(flat.indexOf('当前路由') < flat.indexOf(periodLabel), 'peak belongs to the route card')
    assert.ok(flat.indexOf(periodLabel) < flat.indexOf('本地上游探测'), 'and sits above the status card')
    assert.ok(flat.includes('09:00–12:00'), 'the windows are printed, not implied')

    // The day bar is gone: the number is the answer. It ticks in h:mm:ss and it
    // follows the route, so a holiday shows up as a different number per side.
    const countdown = nodes.find((node) => node.props?.style?.fontSize === 15 && node.props?.style?.fontWeight === 700)
    assert.ok(countdown, 'the countdown replaced the day bar')
    assert.match(label(countdown), /^\d{2,3}:\d{2}:\d{2}$/, 'and reads as hours:minutes:seconds')
    assert.equal(
      nodes.some((node) => node.props?.style?.position === 'relative' && node.props?.style?.height === 20),
      false,
      'no 24-hour bar is left on the page',
    )

    // Folded blocks may hold prices and error tables, never the answer to "is it
    // peak right now" — that was the whole complaint.
    const within = (root, target) => {
      if (root === target) return true
      if (root === null || typeof root !== 'object') return false
      if (Array.isArray(root)) return root.some((child) => within(child, target))
      return (root.children ?? []).some((child) => within(child, target))
    }
    const folded = nodes.filter((node) => node.type === 'details')
    assert.ok(folded.length > 0, 'the page still folds the long blocks')
    assert.equal(folded.some((node) => within(node, period)), false, 'the peak headline is never behind a summary')

    // The router's three actions moved into the route card as small buttons; its
    // own card is gone rather than repeating the route strip it duplicated.
    assert.equal(buttons(tree, '立即探测').length, 1, 'the probe button survives the merge')
    assert.equal(buttons(tree, '重置封禁标记').length, 1, 'so does the mark reset')
    assert.equal(count(flat, '额度路由'), 0, 'the separate router card is gone')

    // Two authorities, one card, one refresh button.
    const heads = nodes.filter((node) => node.props?.style?.fontSize === 12.5)
    assert.equal(heads.length, 2, 'the card holds exactly two section heads: local probe and published')
    assert.equal(count(flatten(heads[0]), '本地上游探测'), 1)
    assert.equal(count(flatten(heads[1]), 'OpenCode 官方状态'), 1)
    assert.equal(buttons(tree, '刷新状态').length, 1, 'the merged card keeps exactly one refresh button')
    assert.equal(buttons(tree, '刷新').length, 1, 'and the page keeps its own refresh')
    // One row per model, both verdicts on it: the local chip is bare, the
    // published one is prefixed with 官方, and the model name appears once.
    const modelRows = nodes.filter((node) => node.props?.['data-ocr'] === 'model-row')
    assert.ok(modelRows.length >= 1, 'the card lists models once, not twice')
    const flashRow = modelRows.find((node) => flatten(node).includes('deepseek-v4.1-flash'))
    assert.ok(flashRow, 'the flash row survives the merge')
    const flashText = flatten(flashRow)
    assert.ok(flashText.includes('官方'), 'the same row carries the published verdict')
    assert.equal(/undefine|NaN|\{|\}/.test(flashText), false, 'the merged row has no hole in it')

    // The row owns both halves of what used to be two lists, and the per-section
    // model headings are gone: only the cost card still says 按模型.
    assert.equal(count(flat, '你正在用的模型'), 0, 'the published model list folded into the merged rows')
    assert.equal(count(flat, '本地上游探测模型'), 0, 'and so did the local one')
    assert.equal(strings(tree).filter((entry) => entry === '按模型').length, 0, 'the bare 按模型 heading is gone')

    // Forms and the price table fold away instead of padding the first screen.
    const details = nodes.filter((node) => node.type === 'details')
    assert.ok(details.length >= 3, 'the error table, the add form and the prices are all collapsible')
    const addForm = details.find((node) => flatten(node).includes('添加账户'))
    assert.ok(addForm, 'adding an account sits behind a summary')
    assert.ok(nodes.some((node) => node.type === 'details' && flatten(node).includes('走 OpenCode')), 'the price table hides behind the verdict')

    assert.equal(/\{|\}|undefined|NaN/.test(flat), false, 'no template placeholder or undefined leaked into the text')

    // The reason is translated, never the raw enum.
    assert.ok(flat.includes(mode === 'fallback' ? '额度用尽' : '额度已恢复'), 'the switch reason is spelled out')
    assert.equal(/quota exhausted|allowance recovered/.test(flat), false, 'raw reasons stay in the payload')

    // The card inherits both verdict chips.
    const chips = strings(tree).filter((entry) => entry.length > 0)
    assert.ok(chips.length > 8, 'the card renders its chips and rows')
  }

  // The frame notice: opaque, timestamped, dismissed by hand.
  const noticeRegistered = load((value) => (Array.isArray(value) && value.length === 0
    ? [{ id: 'n1', at: Date.UTC(2026, 10, 7, 14, 31, 5), mode: 'fallback', reason: 'OpenCode upstream capacity/overload' }]
    : undefined))
  const notice = noticeRegistered.get('opencode-route-notice')
  assert.equal(typeof notice, 'function', 'the notice registers on the shell overlay')

  const empty = load((value) => (Array.isArray(value) ? value : undefined)).get('opencode-route-notice')
  assert.equal(empty(), null, 'no switch, no notice')

  const tree = notice()
  const flat = flatten(tree)
  assert.equal(count(flat, '已切到 DeepSeek 官方订阅'), 1, 'the notice says which way it went')
  assert.ok(flat.includes('上游容量不足'), 'and why, in words')
  assert.match(flat, /\d{1,2}:\d{2}/, 'the notice carries its wall clock')
  assert.equal(tree.props.style.position, 'fixed', 'the notice floats above every column')
  assert.ok(tree.props.style.top >= 48, 'it clears the DSH logo')
  const panel = tree.children[0]
  assert.equal(/rgba|transparent|opacity/.test(String(panel.props.style.background)), false, 'the panel is opaque')
  assert.ok(panel.props.style.boxShadow, 'and separable from the page behind it')
  assert.equal(buttons(tree, '✕').length, 1, 'exactly one dismiss control')

  // The composer label belongs to the shell, but the provider badge it stamps on
  // the trigger ("OpenCode Go") is exactly the stale claim this plugin exists to
  // correct, so the supported slot replaces it with the model name.
  const labelSlot = load().get('opencode-model-label')
  assert.equal(typeof labelSlot, 'function', 'the composer label registers on its own slot')
  const chip = labelSlot({
    provider: { id: 'opencode-go', displayName: 'OpenCode Go' },
    model: { id: 'deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash' },
    placement: 'trigger',
    selected: true,
  })
  assert.equal(label(chip).trim(), 'DeepSeek V4.1 Flash', 'the label keeps the model name and drops the provider badge')
  assert.equal(count(label(chip), 'OpenCode Go'), 0, 'the old OpenCode Go capsule no longer renders')
  assert.match(String(chip.props.title), /OpenCode Go/, 'the tooltip still names the provider')
  assert.equal(labelSlot({ model: null }), null, 'no selection means the slot stays out of the way')
  console.log('client render ok')
}

// The shell's own toast cannot be restyled once: React writes its inline styles
// back on every retry tick, which is how the red bar outlives a dismiss. This
// stands up just enough DOM to prove the guard re-asserts and that a dismissed
// notice leaves no painted wrapper behind.
{
  const makeNode = (tag, options = {}) => {
    const node = {
      nodeType: 1,
      tagName: tag.toUpperCase(),
      isConnected: true,
      children: [],
      parentElement: null,
      textContent: options.text ?? '',
      attrs: {},
      listeners: {},
      style: { display: '', left: '', maxWidth: '', opacity: '', pointerEvents: '', position: '' },
      setAttribute (key, value) { this.attrs[key] = value },
      getAttribute (key) { return this.attrs[key] ?? null },
      addEventListener (type, handler) { this.listeners[type] = handler },
      appendChild (child) {
        child.parentElement = this
        this.children.push(child)
        this.textContent = `${this.textContent}${child.textContent ?? ''}`
        return child
      },
      remove () {
        const parent = this.parentElement
        if (parent === null) return
        parent.children = parent.children.filter((child) => child !== this)
        this.parentElement = null
        this.isConnected = false
      },
      getBoundingClientRect () {
        return { left: options.left ?? 24, top: 64, width: options.width ?? 320, height: options.height ?? 40 }
      },
      closest (selector) {
        let node = this
        while (node !== null && node !== undefined) {
          if (selector === '[data-ocr="route-notice"]' && node.attrs?.['data-ocr'] === 'route-notice') return node
          if (selector === '[data-ocr]' && node.attrs?.['data-ocr'] !== undefined) return node
          node = node.parentElement
        }
        return null
      },
      querySelector (selector) {
        const wanted = selector.replace(/^\[data-ocr="?|"?\]$/g, '')
        const walk = (node) => {
          for (const child of node.children) {
            if (child.attrs?.['data-ocr'] === wanted) return child
            const found = walk(child)
            if (found !== null) return found
          }
          return null
        }
        return walk(this)
      },
      querySelectorAll () { return [] },
    }
    return node
  }

  const body = makeNode('body')
  const wrapper = makeNode('div', { text: '' })
  const toast = makeNode('div', { text: '1 个上游不可用 opencode.ai: connect_timeout ×3 · 约 1s 后重试' })
  wrapper.appendChild(toast)
  body.appendChild(wrapper)

  const document = {
    body,
    head: makeNode('head'),
    createElement: (tag) => makeNode(tag),
    getElementById: () => null,
  }
  let observerCallback = null
  const previous = { document: globalThis.document, getComputedStyle: globalThis.getComputedStyle, MutationObserver: globalThis.MutationObserver }
  globalThis.document = document
  globalThis.getComputedStyle = () => ({
    position: 'fixed',
    opacity: '0.8',
    pointerEvents: 'auto',
    display: 'block',
    backgroundColor: 'rgba(220, 80, 60, 0.14)',
    borderTopColor: 'rgba(220, 80, 60, 1)',
    borderTopWidth: '1px',
  })
  globalThis.MutationObserver = class {
    constructor (callback) { observerCallback = callback }
    observe () {}
    disconnect () {}
  }
  body.querySelectorAll = () => [wrapper, toast]

  const React = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
    Fragment: 'Fragment',
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useRef: (value) => ({ current: value ?? null }),
    useEffect: () => {},
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn(),
    useLayoutEffect: () => {},
  }
  const requireFake = (name) => {
    if (name === 'react') return React
    throw new Error(`client asked for an unexpected module: ${name}`)
  }
  const previousWindow = globalThis.window
  let definition
  globalThis.window = { __ModuleLoader__: { load: (entry) => { definition = entry } } }
  try {
    const source = fs.readFileSync(new URL('./client.js', import.meta.url), 'utf8')
    new Function('window', 'require', source)(globalThis.window, requireFake)
    definition.factory(requireFake).apply({
      slots: { inject: (name, factory) => factory(), register: () => () => {} },
    })

    assert.equal(wrapper.style.opacity, '1', 'the translucent shell toast is made opaque')
    assert.equal(wrapper.style.left, '112px', 'and moved off the brand mark')
    assert.ok(toast.querySelector('[data-ocr="net-close"]') !== null || wrapper.querySelector('[data-ocr="net-close"]') !== null,
      'a close control is attached')

    const close = wrapper.querySelector('[data-ocr="net-close"]')
    close.listeners.click({ stopPropagation () {}, preventDefault () {} })
    assert.equal(wrapper.style.display, 'none', 'one click hides the toast')

    // React puts the inline style back; the guard has to notice and hide it again.
    wrapper.style.display = ''
    wrapper.style.opacity = ''
    observerCallback([{ type: 'attributes', target: wrapper, addedNodes: [] }])
    await new Promise((resolve) => setTimeout(resolve, 200))
    assert.equal(wrapper.style.display, 'none', 'the dismissed toast stays hidden after a re-render')

    console.log('foreign notice guard ok')
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
    if (previous.document === undefined) delete globalThis.document
    else globalThis.document = previous.document
    if (previous.getComputedStyle === undefined) delete globalThis.getComputedStyle
    else globalThis.getComputedStyle = previous.getComputedStyle
    if (previous.MutationObserver === undefined) delete globalThis.MutationObserver
    else globalThis.MutationObserver = previous.MutationObserver
  }
}

// Whose fault an outage is: the whole point of probing both sides.
{
  const ok = { ok: true, status: 200, code: null }
  const refused = { ok: false, status: 0, code: 'ECONNREFUSED' }
  const timedOut = { ok: false, status: 0, code: 'ETIMEDOUT' }
  const noDns = { ok: false, status: 0, code: 'ENOTFOUND' }

  assert.equal(classifyNet({ opencode: ok, official: ok }), 'ok', 'both reachable means the upstream is at fault')
  assert.equal(classifyNet({ opencode: timedOut, official: timedOut }), 'local', 'two dead hosts is the local route')
  assert.equal(classifyNet({ opencode: refused, official: timedOut }), 'local', 'two different local errors are still local')
  assert.equal(classifyNet({ opencode: noDns, official: noDns }), 'dns', 'nothing resolves: local DNS')
  assert.equal(classifyNet({ opencode: noDns, official: timedOut }), 'local', 'one resolves and one does not: the route, not DNS')
  assert.equal(classifyNet({ opencode: refused, official: ok }), 'upstream', 'only OpenCode unreachable names OpenCode')
  assert.equal(classifyNet({ opencode: ok, official: refused }), 'official', 'only the published API unreachable names it')
  assert.equal(classifyNet({ opencode: ok }), 'official', 'a missing side is a failed side')
  assert.equal(classifyNet(undefined), 'official', 'no probe at all is not a healthy verdict')
  assert.equal(classifyNet({ opencode: undefined, official: undefined }), 'official', 'and neither is an empty probe')
  console.log('net classify ok')
}

for (const dispose of disposers) await dispose()
server.close()
console.log('all accounts checks passed')
