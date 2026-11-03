/**
 * OpenCode Go quota router with a multi-account pool and per-model isolation.
 *
 * OpenCode meters every model against its own monthly limit (5-hour = 20% of
 * it, weekly = 50%, monthly = 100%), so an exhausted DeepSeek V4 Pro budget must
 * not drag DeepSeek V4.1 Flash back to the DeepSeek account. This plugin
 * therefore keeps three independent signals:
 *
 * - `accounts[]` — the pool of OpenCode Go credentials, in priority order. The
 *   active one is mirrored into the provider's credential reference
 *   (`apiKeyRef`), because pi-ai resolves that reference once per stream call;
 *   writing it at a step boundary is what makes the next request use another
 *   account. An exhausted account is parked until its window resets, and the
 *   next enabled account takes over.
 * - `quarantine[model]` — one primary model reported exhaustion; only requests
 *   for that model fall back until its window resets.
 * - `mode` — a plan-wide fallback for a failure that no account can serve;
 *   every primary model falls back.
 *
 * Both seams act at step boundaries of one agent: `agent/request` rewrites the
 * call config, `agent/request-error` quarantines and retries the failed step in
 * the same turn. Streaming requests and other agents are never interrupted.
 * Both listeners register with `prepend: true`: a Cordis waterfall returns the
 * outermost listener's value, so an observer appended later could otherwise
 * shadow the rewrite.
 *
 * The Settings page talks to this module over two JSON routes served on the
 * host webserver: `GET <path>.json` returns a secret-free snapshot, and
 * `POST <path>.json` applies one action (`add`, `update`, `remove`, `activate`,
 * `move`, `probe`, `reset`).
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'opencode-quota-router'

/** Routing needs the provider registry to resolve model metadata. */
export const inject = ['llm']

const DEFAULT_USAGE_URL = 'https://opencode.ai/inference/go/v1/usage'
const DEFAULT_API_KEY_REF = 'OPENCODE_API_KEY'
const DEFAULT_PATH = '/opencode-quota-router'
const DEFAULT_PROBE_INTERVAL_MS = 30 * 60 * 1000
const MIN_PROBE_DELAY_MS = 60 * 1000
const UNCONFIRMED_DELAY_MS = 2 * 60 * 1000
const MODEL_QUARANTINE_MS = 30 * 60 * 1000
const AUTH_COOLDOWN_MS = 30 * 60 * 1000
const REQUEST_TIMEOUT_MS = 10 * 1000
const EFFORT_CACHE_TTL_MS = 10 * 60 * 1000
const KEY_REF_PREFIX = 'OPENCODE_API_KEY_'
const BODY_LIMIT_BYTES = 64 * 1024
const AUTH_CODES = new Set([
  'AUTH',
  'INVALID_CREDENTIAL',
  'MISSING_CREDENTIAL',
  'ACCOUNT_SIGN_IN_REQUIRED',
  'CLIENT_UPGRADE_REQUIRED',
])
const QUOTA_MESSAGE = /allowance|usage limit|quota|limit reached|exceed/i

function routePair(raw) {
  const primary = raw?.primary
  const fallback = raw?.fallback
  if (typeof primary?.provider !== 'string' || typeof primary?.model !== 'string') return undefined
  if (typeof fallback?.provider !== 'string' || typeof fallback?.model !== 'string') return undefined
  return { primary: { provider: primary.provider, model: primary.model }, fallback: { provider: fallback.provider, model: fallback.model } }
}

function normalize(config) {
  const routes = Array.isArray(config?.routes) ? config.routes.map(routePair).filter((entry) => entry !== undefined) : []
  const endpoint = typeof config?.path === 'string' && config.path.startsWith('/') ? config.path.replace(/\/+$/, '') : DEFAULT_PATH
  return {
    routes,
    usageUrl: typeof config?.usageUrl === 'string' && config.usageUrl.length > 0 ? config.usageUrl : DEFAULT_USAGE_URL,
    apiKeyRef: typeof config?.apiKeyRef === 'string' && config.apiKeyRef.length > 0 ? config.apiKeyRef : DEFAULT_API_KEY_REF,
    probeIntervalMs: Number.isFinite(config?.probeIntervalMs) && config.probeIntervalMs >= 1000 ? config.probeIntervalMs : DEFAULT_PROBE_INTERVAL_MS,
    minProbeDelayMs: Number.isFinite(config?.minProbeDelayMs) && config.minProbeDelayMs >= 1000 ? config.minProbeDelayMs : MIN_PROBE_DELAY_MS,
    unconfirmedDelayMs: Number.isFinite(config?.unconfirmedDelayMs) && config.unconfirmedDelayMs >= 1000 ? config.unconfirmedDelayMs : UNCONFIRMED_DELAY_MS,
    modelQuarantineMs: Number.isFinite(config?.modelQuarantineMs) && config.modelQuarantineMs >= 1000 ? config.modelQuarantineMs : MODEL_QUARANTINE_MS,
    authCooldownMs: Number.isFinite(config?.authCooldownMs) && config.authCooldownMs >= 1000 ? config.authCooldownMs : AUTH_COOLDOWN_MS,
    statePath: typeof config?.statePath === 'string' && config.statePath.length > 0 ? config.statePath : path.join(dshHome(), 'opencode-quota-router.json'),
    path: endpoint,
  }
}

function dshHome() {
  const configured = process.env.DSH_HOME
  return configured !== undefined && configured.length > 0 ? configured : path.join(os.homedir(), '.dsh')
}

/** Whether one quota window reports exhaustion. */
function windowExhausted(window) {
  if (window === null || typeof window !== 'object') return false
  const percent = typeof window.percent === 'number' ? window.percent : undefined
  if (percent !== undefined && percent >= 100) return true
  const status = typeof window.status === 'string' ? window.status.toLowerCase() : ''
  return /limit|exhaust|block|denied|exceed/.test(status)
}

/** Whether any quota window reports plan-wide exhaustion. */
export function isExhausted(usage) {
  return windowExhausted(usage?.rolling) || windowExhausted(usage?.weekly) || windowExhausted(usage?.monthly)
}

/** The moment an exhausted account can be tried again: the latest exhausted window reset. */
export function retryAfter(usage, now, fallbackMs) {
  let until = 0
  for (const name of ['rolling', 'weekly', 'monthly']) {
    const window = usage?.[name]
    if (!windowExhausted(window)) continue
    const reset = Date.parse(window?.resetsAt ?? '')
    until = Math.max(until, Number.isFinite(reset) && reset > now ? reset + 2000 : now + fallbackMs)
  }
  return until
}

/** When to probe next: the rolling-window reset when it is near, otherwise the fixed interval. */
export function nextProbeAt(usage, now, intervalMs, minDelayMs = MIN_PROBE_DELAY_MS) {
  const ceiling = now + intervalMs
  const reset = Date.parse(usage?.rolling?.resetsAt ?? '')
  if (Number.isFinite(reset) && reset > now) return Math.min(ceiling, Math.max(now + minDelayMs, reset + 2000))
  return ceiling
}

/** The visible part of a stored secret: enough to tell two keys apart, never enough to use one. */
export function maskKey(key) {
  if (typeof key !== 'string' || key.length === 0) return undefined
  if (key.length <= 12) return `${key.slice(0, 3)}…`
  return `${key.slice(0, 7)}…${key.slice(-4)}`
}

function normalizeAccount(raw) {
  if (raw === null || typeof raw !== 'object') return undefined
  const id = typeof raw.id === 'string' && /^[a-z0-9][a-z0-9-]{0,31}$/.test(raw.id) ? raw.id : undefined
  if (id === undefined) return undefined
  const account = {
    id,
    label: typeof raw.label === 'string' && raw.label.trim().length > 0 ? raw.label.trim().slice(0, 60) : id,
    keyRef: typeof raw.keyRef === 'string' && raw.keyRef.length > 0 ? raw.keyRef : `${KEY_REF_PREFIX}${id.toUpperCase()}`,
    enabled: raw.enabled !== false,
    exhaustedUntil: Number.isFinite(raw.exhaustedUntil) ? raw.exhaustedUntil : 0,
    usage: raw.usage !== null && typeof raw.usage === 'object' ? raw.usage : null,
    checkedAt: Number.isFinite(raw.checkedAt) ? raw.checkedAt : 0,
  }
  if (typeof raw.exhaustReason === 'string' && raw.exhaustReason.length > 0) account.exhaustReason = raw.exhaustReason
  if (typeof raw.lastError === 'string' && raw.lastError.length > 0) account.lastError = raw.lastError.slice(0, 300)
  // Inline secrets only appear when the credential service refused the write.
  if (typeof raw.key === 'string' && raw.key.length > 0) account.key = raw.key
  return account
}

function initialState() {
  return {
    version: 3,
    mode: 'primary',
    reason: 'initial',
    until: 0,
    active: null,
    accounts: [],
    quarantine: {},
    usage: null,
    checkedAt: 0,
    updatedAt: Date.now(),
  }
}

function readState(statePath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'))
    if (parsed === null || typeof parsed !== 'object') return undefined
    const quarantine = {}
    if (parsed.quarantine !== null && typeof parsed.quarantine === 'object') {
      for (const [model, entry] of Object.entries(parsed.quarantine)) {
        if (entry !== null && typeof entry === 'object' && Number.isFinite(entry.until)) quarantine[model] = { until: entry.until, reason: String(entry.reason ?? 'quota') }
      }
    }
    const accounts = Array.isArray(parsed.accounts) ? parsed.accounts.map(normalizeAccount).filter((entry) => entry !== undefined) : []
    const active = typeof parsed.active === 'string' && accounts.some((account) => account.id === parsed.active) ? parsed.active : accounts[0]?.id ?? null
    return {
      version: 3,
      mode: parsed.mode === 'fallback' ? 'fallback' : 'primary',
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'loaded',
      until: Number.isFinite(parsed.until) ? parsed.until : 0,
      active,
      accounts,
      quarantine,
      usage: parsed.usage !== null && typeof parsed.usage === 'object' ? parsed.usage : null,
      checkedAt: Number.isFinite(parsed.checkedAt) ? parsed.checkedAt : 0,
      updatedAt: Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : Date.now(),
    }
  } catch {
    return undefined
  }
}

function mtimeOf(target) {
  try {
    return fs.statSync(target).mtimeMs
  } catch {
    return 0
  }
}

function retarget(config, target, reasoningEffort) {
  const { reasoningEffort: _dropped, ...rest } = config
  return {
    ...rest,
    provider: target.provider,
    model: target.model,
    ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
  }
}

export function apply(ctx, config = {}) {
  const cfg = normalize(config)
  if (cfg.routes.length === 0) {
    ctx.logger.warn('opencode-quota-router: no route pairs configured; the plugin stays idle')
    return
  }

  let state = readState(cfg.statePath) ?? initialState()
  let lastMtime = mtimeOf(cfg.statePath)
  let hasKey = true
  let mirroredKey
  let timer
  let bootTimer
  let disposed = false
  const effortCache = new Map()
  const lifetime = new AbortController()

  const log = {
    info: (message) => safeLog(ctx, 'info', message),
    warn: (message) => safeLog(ctx, 'warn', message),
  }

  function saveState() {
    try {
      fs.mkdirSync(path.dirname(cfg.statePath), { recursive: true })
      const temp = `${cfg.statePath}.${process.pid}.tmp`
      fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
      fs.renameSync(temp, cfg.statePath)
      lastMtime = mtimeOf(cfg.statePath)
    } catch (error) {
      log.warn(`could not persist quota state to ${cfg.statePath}: ${describeError(error)}`)
    }
  }

  function refreshStateFromDisk() {
    const mtime = mtimeOf(cfg.statePath)
    if (mtime === 0 || mtime === lastMtime) return
    lastMtime = mtime
    const loaded = readState(cfg.statePath)
    if (loaded === undefined) return
    const changed =
      loaded.mode !== state.mode ||
      loaded.until !== state.until ||
      loaded.active !== state.active ||
      loaded.accounts.length !== state.accounts.length ||
      JSON.stringify(loaded.quarantine) !== JSON.stringify(state.quarantine)
    state = loaded
    if (changed) {
      log.info(`state reloaded from disk: ${state.mode}; ${state.accounts.length} account(s); quarantined ${Object.keys(state.quarantine).length}`)
      schedule()
    }
  }

  function clearTimer() {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  /** Drop quarantine entries whose window has passed. */
  function expireQuarantine() {
    const now = Date.now()
    let changed = false
    for (const [model, entry] of Object.entries(state.quarantine)) {
      if (entry.until <= now) {
        delete state.quarantine[model]
        changed = true
        log.info(`${model}: quarantine expired; the next request tries OpenCode again`)
      }
    }
    if (changed) {
      state.updatedAt = now
      saveState()
    }
    return changed
  }

  function schedule() {
    clearTimer()
    if (disposed) return
    const now = Date.now()
    const marks = []
    if (state.mode === 'fallback' && state.until > now) marks.push(state.until)
    for (const entry of Object.values(state.quarantine)) if (entry.until > now) marks.push(entry.until)
    for (const account of state.accounts) if (account.exhaustedUntil > now) marks.push(account.exhaustedUntil)
    const target = marks.length > 0 ? Math.min(...marks) : now + cfg.probeIntervalMs
    timer = setTimeout(() => {
      timer = undefined
      void runProbe()
    }, Math.min(Math.max(cfg.minProbeDelayMs, target - now), 2 ** 31 - 1))
    timer.unref?.()
  }

  const credentials = () => {
    try {
      return ctx.get('credentials')
    } catch {
      return undefined
    }
  }

  /** The secret behind one account: credential store first, then inline, then the ambient environment. */
  async function accountKey(account) {
    const service = credentials()
    if (service !== undefined && typeof service.resolve === 'function') {
      try {
        const hit = await service.resolve(account.keyRef)
        if (typeof hit?.value === 'string' && hit.value.length > 0) return hit.value
      } catch (error) {
        log.warn(`could not resolve ${account.keyRef}: ${describeError(error)}`)
      }
    }
    if (typeof account.key === 'string' && account.key.length > 0) return account.key
    const ambient = process.env[account.keyRef]
    return typeof ambient === 'string' && ambient.length > 0 ? ambient : undefined
  }

  /** Store a secret where the credential seam can find it; fall back to the state file. */
  async function storeKey(account, key) {
    const service = credentials()
    if (service !== undefined && typeof service.set === 'function') {
      try {
        await service.set(account.keyRef, key)
        delete account.key
        return true
      } catch (error) {
        log.warn(`could not store ${account.keyRef} in the credential store: ${describeError(error)}`)
      }
    }
    account.key = key
    return false
  }

  /**
   * Push the active account's key into the reference the provider reads. pi-ai
   * resolves that reference once per stream call, so a write before the call
   * reaches the wire; the guard keeps a steady state from rewriting the file.
   */
  async function mirrorActive(force) {
    const account = activeAccount()
    if (account === undefined) {
      hasKey = false
      return false
    }
    const key = await accountKey(account)
    if (key === undefined) {
      hasKey = false
      return false
    }
    hasKey = true
    if (!force && mirroredKey === key) return true
    const service = credentials()
    if (service !== undefined && typeof service.set === 'function') {
      try {
        await service.set(cfg.apiKeyRef, key)
        mirroredKey = key
        return true
      } catch (error) {
        log.warn(`could not mirror the active key into ${cfg.apiKeyRef}: ${describeError(error)}`)
      }
    }
    try {
      process.env[cfg.apiKeyRef] = key
      mirroredKey = key
      return true
    } catch {
      return false
    }
  }

  function activeAccount() {
    return state.accounts.find((account) => account.id === state.active) ?? state.accounts[0]
  }

  function usableAccount(now = Date.now()) {
    return state.accounts.find((account) => account.enabled !== false && account.exhaustedUntil <= now)
  }

  function nextAccountId() {
    for (let index = 1; index <= 99; index += 1) {
      const id = `a${index}`
      if (!state.accounts.some((account) => account.id === id)) return id
    }
    return `a${Date.now().toString(36)}`
  }

  async function switchTo(account, reason) {
    if (account === undefined) return false
    const previous = state.active
    state.active = account.id
    state.reason = reason
    state.updatedAt = Date.now()
    const mirrored = await mirrorActive(true)
    saveState()
    if (previous !== account.id) log.info(`active account ${previous ?? 'none'} -> ${account.id} (${reason})`)
    return mirrored
  }

  /** Adopt the key that was configured before this pool existed as the first account. */
  async function seedAccounts() {
    if (state.accounts.length === 0) {
      const id = nextAccountId()
      state.accounts.push({
        id,
        label: '主账号',
        keyRef: `${KEY_REF_PREFIX}${id.toUpperCase()}`,
        enabled: true,
        exhaustedUntil: 0,
        usage: null,
        checkedAt: 0,
      })
      state.active = id
      state.updatedAt = Date.now()
      saveState()
    }
    const first = state.accounts[0]
    const service = credentials()
    if (first !== undefined && service !== undefined && typeof service.resolve === 'function' && typeof service.set === 'function') {
      try {
        const own = await service.resolve(first.keyRef)
        if (own?.value === undefined) {
          const legacy = await service.resolve(cfg.apiKeyRef)
          if (typeof legacy?.value === 'string' && legacy.value.length > 0) {
            await service.set(first.keyRef, legacy.value)
            log.info(`adopted ${cfg.apiKeyRef} as account ${first.id}`)
          }
        }
      } catch (error) {
        log.warn(`could not adopt the existing key: ${describeError(error)}`)
      }
    }
    if (state.active === null || !state.accounts.some((account) => account.id === state.active)) state.active = state.accounts[0]?.id ?? null
  }

  async function probeAccount(account, force) {
    const now = Date.now()
    if (!force && account.checkedAt > 0 && now - account.checkedAt < cfg.probeIntervalMs) return account.usage
    const key = await accountKey(account)
    if (key === undefined) {
      account.checkedAt = now
      account.lastError = 'no credential'
      return undefined
    }
    try {
      const response = await fetch(cfg.usageUrl, {
        headers: { authorization: `Bearer ${key}`, accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      account.checkedAt = Date.now()
      if (!response.ok) {
        account.lastError = `usage endpoint answered HTTP ${response.status}`
        if (response.status === 401 || response.status === 403) {
          account.exhaustedUntil = Date.now() + cfg.authCooldownMs
          account.exhaustReason = `auth (HTTP ${response.status})`
        }
        return undefined
      }
      const usage = (await response.json())?.usage
      if (usage === null || typeof usage !== 'object') {
        account.lastError = 'usage endpoint returned no usage block'
        return undefined
      }
      account.usage = usage
      account.lastError = undefined
      if (isExhausted(usage)) {
        account.exhaustedUntil = retryAfter(usage, Date.now(), cfg.probeIntervalMs)
        account.exhaustReason = 'quota'
      } else if (account.exhaustedUntil > 0 && account.exhaustReason === 'quota') {
        account.exhaustedUntil = 0
        account.exhaustReason = undefined
      }
      return usage
    } catch (error) {
      account.checkedAt = Date.now()
      account.lastError = describeError(error)
      return undefined
    }
  }

  async function probeAll(options = {}) {
    const force = options.force === true
    const targets = options.only === undefined ? state.accounts : [options.only]
    const results = await Promise.all(targets.map((account) => probeAccount(account, force)))
    const active = activeAccount()
    const usage = active?.usage
    if (usage !== undefined && usage !== null) {
      state.usage = usage
      state.checkedAt = Date.now()
    }
    state.updatedAt = Date.now()
    saveState()
    return results
  }

  async function runProbe() {
    if (disposed) return
    expireQuarantine()
    await probeAll({ force: true })
    if (disposed) return
    const now = Date.now()
    const active = activeAccount()
    const activeBlocked = active === undefined || active.enabled === false || active.exhaustedUntil > now
    if (activeBlocked) {
      const next = usableAccount(now)
      if (next !== undefined) await switchTo(next, `failover: ${active === undefined ? 'no account' : active.id} unavailable`)
    }
    if (state.mode === 'fallback') {
      const usable = usableAccount(now)
      if (usable !== undefined) {
        await switchTo(usable, 'allowance recovered')
        resume('allowance recovered')
        return
      }
      const usage = activeAccount()?.usage
      state.until = usage ? nextProbeAt(usage, now, cfg.probeIntervalMs) : now + cfg.probeIntervalMs
      state.updatedAt = Date.now()
      saveState()
      schedule()
      return
    }
    schedule()
  }

  function planFallback(reason, failure, delayMs) {
    state.mode = 'fallback'
    state.reason = reason
    state.until = Date.now() + Math.max(cfg.minProbeDelayMs, delayMs)
    state.lastFailure = failure === undefined ? state.lastFailure ?? null : { code: String(failure.code ?? 'UNKNOWN'), status: typeof failure.status === 'number' ? failure.status : undefined, message: String(failure.message ?? '').slice(0, 400), at: Date.now() }
    state.updatedAt = Date.now()
    saveState()
    schedule()
    log.warn(`plan-wide fallback (${reason}); next probe in ~${Math.round(Math.max(cfg.minProbeDelayMs, delayMs) / 60000)} min`)
  }

  function quarantineModel(model, reason, untilMs) {
    state.quarantine[model] = { until: untilMs, reason }
    state.updatedAt = Date.now()
    saveState()
    schedule()
    log.warn(`${model} is quarantined (${reason}); only that model falls back until ${new Date(untilMs).toLocaleTimeString()}`)
  }

  function resume(reason) {
    const changed = state.mode !== 'primary' || Object.keys(state.quarantine).length > 0
    state.mode = 'primary'
    state.reason = reason
    state.until = 0
    state.quarantine = {}
    state.updatedAt = Date.now()
    saveState()
    clearTimer()
    if (changed) log.info(`OpenCode Go is usable again (${reason})`)
  }

  function providerRegistered(provider) {
    try {
      return ctx.llm.listProviders().some((entry) => entry.id === provider)
    } catch {
      return false
    }
  }

  async function effortFor(target, requested) {
    if (requested === undefined || requested === null || requested === '') return undefined
    const key = `${target.provider}\u0000${target.model}`
    let efforts = effortCache.get(key)
    if (efforts === undefined) {
      try {
        const info = await ctx.llm.resolveModelInfo(target.provider, target.model)
        efforts = (info?.reasoning?.efforts ?? []).map((effort) => effort.id)
      } catch {
        return undefined
      }
      effortCache.set(key, efforts)
      const eviction = setTimeout(() => effortCache.delete(key), EFFORT_CACHE_TTL_MS)
      eviction.unref?.()
    }
    if (efforts.length === 0) return undefined
    if (efforts.includes(requested)) return requested
    if ((requested === 'off' || requested === 'minimal') && efforts.includes('low')) return 'low'
    if (efforts.includes('high')) return 'high'
    return efforts[efforts.length - 1]
  }

  function matchRoute(config) {
    for (const route of cfg.routes) {
      if (config.provider === route.primary.provider && config.model === route.primary.model) return { route, side: 'primary' }
      if (config.provider === route.fallback.provider && config.model === route.fallback.model) return { route, side: 'fallback' }
    }
    return undefined
  }

  /** Whether this route's primary model must currently fall back. */
  function primaryBlocked(route) {
    if (state.mode === 'fallback') return true
    if (usableAccount() === undefined) return true
    const entry = state.quarantine[route.primary.model]
    return entry !== undefined && entry.until > Date.now()
  }

  async function route(config) {
    if (typeof config?.provider !== 'string' || typeof config?.model !== 'string') return config
    refreshStateFromDisk()
    expireQuarantine()
    const match = matchRoute(config)
    if (match === undefined) return config
    const desired = primaryBlocked(match.route) ? 'fallback' : 'primary'
    if (match.side === desired) {
      if (desired === 'primary') await mirrorActive(false)
      return config
    }
    const target = desired === 'primary' ? match.route.primary : match.route.fallback
    if (!providerRegistered(target.provider)) return config
    if (desired === 'primary') {
      const mirrored = await mirrorActive(false)
      if (!mirrored || !hasKey) return config
    }
    const reasoningEffort = await effortFor(target, config.reasoningEffort)
    log.info(`route ${match.side} -> ${desired}: ${target.provider}/${target.model}${reasoningEffort === undefined ? '' : ` @ ${reasoningEffort}`}`)
    return retarget(config, target, reasoningEffort)
  }

  /** The model the failed attempt actually used, from the durable request header. */
  function failedModel(payload) {
    try {
      const header = payload?.agent?.session?.requestHeader?.()
      const config = header?.config ?? header?.header?.config
      if (typeof config?.model === 'string' && typeof config?.provider === 'string' && config.provider === cfg.routes.find((route) => route.primary.provider === payload.provider)?.primary.provider) return config.model
      return typeof config?.model === 'string' ? config.model : undefined
    } catch {
      return undefined
    }
  }

  async function recover(payload, next) {
    const failure = payload?.failure
    if (failure === undefined || failure === null) return next()
    const provider = payload.provider
    const routes = cfg.routes.filter((route) => route.primary.provider === provider)
    if (routes.length === 0) return next()
    const code = String(failure.code ?? '').toUpperCase()
    const model = failedModel(payload)

    if (AUTH_CODES.has(code)) {
      const current = activeAccount()
      if (current !== undefined) {
        current.exhaustedUntil = Date.now() + cfg.authCooldownMs
        current.exhaustReason = `auth (${code})`
        current.lastError = String(failure.message ?? '').slice(0, 300)
        state.updatedAt = Date.now()
        saveState()
      }
      const alternative = usableAccount()
      if (alternative !== undefined && alternative.id !== current?.id) {
        await switchTo(alternative, `account failover after ${code}`)
        return { kind: 'retry' }
      }
      planFallback(`OpenCode authentication failed (${code})`, failure, cfg.unconfirmedDelayMs)
      return { kind: 'retry' }
    }

    const hard = code === 'QUOTA' || code === 'ACCOUNT_QUOTA'
    const soft = code === 'RATE_LIMIT' || failure.status === 429
    if (!hard && !soft) return next()

    await probeAll({ force: true })
    const now = Date.now()
    const current = activeAccount()
    const currentBlocked = current === undefined || current.enabled === false || current.exhaustedUntil > now
    const alternative = usableAccount(now)
    const quoted = QUOTA_MESSAGE.test(String(failure.message ?? ''))

    // Another account still has allowance: switch to it and retry this step.
    if (currentBlocked && alternative !== undefined && alternative.id !== current?.id) {
      await switchTo(alternative, `quota failover from ${current?.id ?? 'none'}`)
      return { kind: 'retry' }
    }

    const usage = current?.usage ?? state.usage
    const usageExhausted = usage !== undefined && usage !== null && isExhausted(usage)

    // A transient rate limit with room left belongs to the provider retry policy.
    if (!hard && !usageExhausted && !quoted) return next()

    if (alternative === undefined) {
      const delay = usage === undefined ? cfg.unconfirmedDelayMs : Math.max(cfg.minProbeDelayMs, nextProbeAt(usage, Date.now(), cfg.probeIntervalMs) - Date.now())
      planFallback(hard ? 'every OpenCode account is out of allowance' : 'OpenCode quota window exhausted', failure, delay)
      return { kind: 'retry' }
    }

    if (model !== undefined) {
      const delay = usage === undefined ? cfg.modelQuarantineMs : Math.max(cfg.minProbeDelayMs, nextProbeAt(usage, Date.now(), cfg.probeIntervalMs) - Date.now())
      quarantineModel(model, hard ? 'reported quota exhaustion' : 'quota window exhausted', Date.now() + Math.min(delay, cfg.modelQuarantineMs))
      return { kind: 'retry' }
    }

    const delay = usage === undefined ? cfg.unconfirmedDelayMs : nextProbeAt(usage, Date.now(), cfg.probeIntervalMs) - Date.now()
    planFallback(hard ? 'OpenCode quota exhausted' : 'OpenCode quota window exhausted', failure, delay)
    return { kind: 'retry' }
  }

  const disposeRoute = ctx.on('agent/request', async (payload, next) => {
    const base = await next()
    try {
      return await route(base)
    } catch (error) {
      log.warn(`could not rewrite the request route: ${describeError(error)}`)
      return base
    }
  }, { prepend: true })

  const disposeRecover = ctx.on('agent/request-error', (payload, next) => {
    if (disposed || lifetime.signal.aborted) return Promise.resolve(undefined)
    return recover(payload, next).catch((error) => {
      log.warn(`request recovery failed: ${describeError(error)}`)
      return next()
    })
  }, { prepend: true })

  ctx.effect(() => () => {
    disposed = true
    disposeRoute()
    disposeRecover()
    clearTimer()
    if (bootTimer !== undefined) clearTimeout(bootTimer)
    lifetime.abort(new Error('opencode-quota-router disposed'))
  }, 'opencode-quota-router: stop routing and probing')

  // ---- Settings surface ---------------------------------------------------

  async function describeAccount(account) {
    const service = credentials()
    let configured = typeof account.key === 'string' && account.key.length > 0
    let source
    let hint
    if (service !== undefined && typeof service.resolve === 'function') {
      try {
        const hit = await service.resolve(account.keyRef)
        if (typeof hit?.value === 'string' && hit.value.length > 0) {
          configured = true
          source = hit.source
          hint = maskKey(hit.value)
        }
      } catch {
        /* a broken store must not hide the rest of the pool */
      }
    }
    if (hint === undefined && typeof account.key === 'string') hint = maskKey(account.key)
    if (hint === undefined) {
      const ambient = process.env[account.keyRef]
      if (typeof ambient === 'string' && ambient.length > 0) {
        configured = true
        source = 'env'
        hint = maskKey(ambient)
      }
    }
    const now = Date.now()
    const status = account.enabled === false
      ? 'disabled'
      : account.exhaustedUntil > now
        ? account.exhaustReason !== undefined && account.exhaustReason.startsWith('auth') ? 'auth' : 'exhausted'
        : configured ? 'ready' : 'missing'
    return {
      id: account.id,
      label: account.label,
      keyRef: account.keyRef,
      enabled: account.enabled !== false,
      active: state.active === account.id,
      configured,
      source: source ?? null,
      hint: hint ?? null,
      status,
      exhaustedUntil: account.exhaustedUntil > now ? account.exhaustedUntil : 0,
      exhaustReason: account.exhaustReason ?? null,
      lastError: account.lastError ?? null,
      checkedAt: account.checkedAt,
      usage: account.usage,
    }
  }

  async function snapshot() {
    const now = Date.now()
    const accounts = await Promise.all(state.accounts.map((account) => describeAccount(account)))
    const active = activeAccount()
    const next = (() => {
      const marks = []
      if (state.mode === 'fallback' && state.until > now) marks.push(state.until)
      for (const entry of Object.values(state.quarantine)) if (entry.until > now) marks.push(entry.until)
      for (const account of state.accounts) if (account.exhaustedUntil > now) marks.push(account.exhaustedUntil)
      return marks.length > 0 ? Math.min(...marks) : null
    })()
    return {
      version: 3,
      mode: state.mode,
      reason: state.reason,
      until: state.until,
      active: active?.id ?? null,
      activeLabel: active?.label ?? null,
      updatedAt: state.updatedAt,
      checkedAt: state.checkedAt,
      nextProbeAt: next,
      probeIntervalMs: cfg.probeIntervalMs,
      usage: active?.usage ?? state.usage,
      accounts,
      quarantine: Object.entries(state.quarantine)
        .filter(([, entry]) => entry.until > now)
        .map(([model, entry]) => ({ model, until: entry.until, reason: entry.reason })),
      routes: cfg.routes,
      lastFailure: state.lastFailure ?? null,
    }
  }

  function sendJson(response, status, body) {
    const text = JSON.stringify(body, null, 2)
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(text)
  }

  function readBody(request) {
    return new Promise((resolve, reject) => {
      let size = 0
      const chunks = []
      request.on('data', (chunk) => {
        size += chunk.length
        if (size > BODY_LIMIT_BYTES) {
          reject(new Error('request body is too large'))
          request.destroy()
          return
        }
        chunks.push(chunk)
      })
      request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      request.on('error', reject)
    })
  }

  function findAccount(id) {
    return state.accounts.find((account) => account.id === id)
  }

  async function applyAction(body) {
    const action = typeof body?.action === 'string' ? body.action : ''
    if (action === 'add') {
      const key = String(body.key ?? '').trim()
      if (key.length < 8) throw new Error('密钥不完整：至少 8 个字符')
      const id = nextAccountId()
      const label = String(body.label ?? '').trim().slice(0, 60) || `账户 ${state.accounts.length + 1}`
      const account = { id, label, keyRef: `${KEY_REF_PREFIX}${id.toUpperCase()}`, enabled: true, exhaustedUntil: 0, usage: null, checkedAt: 0 }
      await storeKey(account, key)
      state.accounts.push(account)
      state.updatedAt = Date.now()
      if (state.active === null || activeAccount() === undefined) state.active = id
      saveState()
      await probeAccount(account, true)
      if (state.accounts.length === 1) await switchTo(account, 'first account added')
      saveState()
      return { ok: true, id }
    }

    if (action === 'update') {
      const account = findAccount(String(body.id ?? ''))
      if (account === undefined) throw new Error(`没有账户 ${body.id}`)
      if (typeof body.label === 'string' && body.label.trim().length > 0) account.label = body.label.trim().slice(0, 60)
      if (typeof body.enabled === 'boolean') account.enabled = body.enabled
      if (typeof body.key === 'string' && body.key.trim().length > 0) {
        await storeKey(account, body.key.trim())
        account.exhaustedUntil = 0
        account.exhaustReason = undefined
        account.lastError = undefined
        if (state.active === account.id) await mirrorActive(true)
        await probeAccount(account, true)
      }
      state.updatedAt = Date.now()
      saveState()
      return { ok: true }
    }

    if (action === 'remove') {
      const account = findAccount(String(body.id ?? ''))
      if (account === undefined) throw new Error(`没有账户 ${body.id}`)
      if (state.accounts.length === 1) throw new Error('至少保留一个账户')
      state.accounts = state.accounts.filter((entry) => entry.id !== account.id)
      const service = credentials()
      if (service !== undefined && typeof service.unset === 'function') {
        try {
          await service.unset(account.keyRef)
        } catch (error) {
          log.warn(`could not clear ${account.keyRef}: ${describeError(error)}`)
        }
      }
      if (state.active === account.id) {
        const next = usableAccount() ?? state.accounts[0]
        await switchTo(next, `active account ${account.id} removed`)
      }
      state.updatedAt = Date.now()
      saveState()
      return { ok: true }
    }

    if (action === 'activate') {
      const account = findAccount(String(body.id ?? ''))
      if (account === undefined) throw new Error(`没有账户 ${body.id}`)
      account.enabled = true
      account.exhaustedUntil = 0
      account.exhaustReason = undefined
      const mirrored = await switchTo(account, 'selected in Settings')
      if (!mirrored) throw new Error(`账户 ${account.id} 没有可用的密钥`)
      return { ok: true }
    }

    if (action === 'move') {
      const account = findAccount(String(body.id ?? ''))
      if (account === undefined) throw new Error(`没有账户 ${body.id}`)
      const index = state.accounts.indexOf(account)
      const direction = body.direction === 'up' ? -1 : 1
      const target = index + direction
      if (target < 0 || target >= state.accounts.length) return { ok: true, moved: false }
      state.accounts.splice(index, 1)
      state.accounts.splice(target, 0, account)
      state.updatedAt = Date.now()
      saveState()
      return { ok: true, moved: true }
    }

    if (action === 'probe') {
      // A per-account probe lets the settings dialog refresh one card without
      // spending a request on every other account's key.
      const wanted = body?.id
      const only = typeof wanted === 'string' && wanted.length > 0
        ? state.accounts.find((entry) => entry.id === wanted)
        : undefined
      if (wanted !== undefined && only === undefined) throw new Error(`没有账户 ${wanted}`)
      await probeAll({ force: true, ...(only === undefined ? {} : { only }) })
      return { ok: true }
    }

    if (action === 'reset') {
      for (const account of state.accounts) {
        account.exhaustedUntil = 0
        account.exhaustReason = undefined
      }
      resume('reset in Settings')
      schedule()
      return { ok: true }
    }

    throw new Error(`未知操作：${action}`)
  }

  async function handleApi(request, response) {
    try {
      if (request.method === 'POST') {
        const text = await readBody(request)
        let body
        try {
          body = text.length === 0 ? {} : JSON.parse(text)
        } catch {
          throw new Error('请求体不是合法 JSON')
        }
        await applyAction(body)
      }
      sendJson(response, 200, await snapshot())
    } catch (error) {
      sendJson(response, 400, { error: describeError(error) })
    }
  }

  let disposeApi
  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (scope) => {
      try {
        disposeApi = scope.webServer.register({ kind: 'exact', path: `${cfg.path}.json`, handler: handleApi })
        scope.effect(() => () => {
          if (disposeApi !== undefined) disposeApi()
        }, 'opencode-quota-router: unregister the Settings API')
      } catch (error) {
        log.warn(`could not serve the Settings API at ${cfg.path}.json: ${describeError(error)}`)
      }
    })
  }

  // ---- Boot ---------------------------------------------------------------

  const quarantined = Object.keys(state.quarantine)
  log.info(`watching ${cfg.routes.length} route(s); mode ${state.mode}; ${state.accounts.length} account(s); quarantined ${quarantined.length === 0 ? 'none' : quarantined.join(', ')}`)

  schedule()
  bootTimer = setTimeout(() => {
    bootTimer = undefined
    void (async () => {
      if (disposed) return
      await seedAccounts()
      await mirrorActive(true)
      await runProbe()
    })().catch((error) => log.warn(`startup probe failed: ${describeError(error)}`))
  }, 1500)
  bootTimer.unref?.()
}

function safeLog(ctx, level, message) {
  try {
    ctx.logger[level](`opencode-quota-router: ${message}`)
  } catch {
    /* logging must never break routing */
  }
}

function describeError(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
