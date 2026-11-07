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
 * The `llm/stream` waterfall is the routing seam: the agent fixes provider and
 * model when a step is prepared, so the plugin intercepts the actual streaming
 * call instead of rewriting the request config. A failed primary attempt before
 * the first chunk can be retried on another account or on the route's fallback
 * side. The listener registers with `prepend: true`: a Cordis waterfall returns
 * the outermost listener's value, so an observer appended later could otherwise
 * shadow the route.
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
// OpenCode publishes a machine-readable status feed: current verdict, one row
// per plan and per model (with the reason), live incidents and a week of
// history. No authentication, refreshed about once a minute.
const DEFAULT_STATUS_URL = 'https://status.opencode.ai/api/status'
const STATUS_REFRESH_MS = 60 * 1000
const STATUS_STALE_MS = 5 * 60 * 1000
const DEFAULT_API_KEY_REF = 'OPENCODE_API_KEY'
const DEFAULT_PATH = '/opencode-quota-router'
const DEFAULT_PROBE_INTERVAL_MS = 30 * 60 * 1000
const MIN_PROBE_DELAY_MS = 60 * 1000
const UNCONFIRMED_DELAY_MS = 2 * 60 * 1000
// Once OpenCode answers again the router does not jump straight back: it keeps
// probing for this long, and only a window with no failed probe at all resumes
// the primary route. Ten minutes is long enough to outlast a provider's rolling
// rate-limit window, short enough that a real recovery is not felt as downtime.
const RECOVER_STABLE_MS = 10 * 60 * 1000
// Cadence of the probes that watch for that recovery.
const RECOVERY_PROBE_MS = 60 * 1000
// How far back the status card counts failures per model.
const STATUS_WINDOW_MS = 30 * 60 * 1000
const STATUS_HISTORY = 24
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
// Upstream capacity refusals are not quota exhaustion: the allowance is intact
// but the provider's serving cell is full. They are transient at the provider
// level and can outlast the provider retry policy, so they get their own
// fallback trigger instead of being treated as an ordinary rate limit.
const CAPACITY_MESSAGE = /overloaded|at capacity|prefill_cap_refused|ttft_admission_refused|capacity refused/i
// Marks a stream this plugin re-dispatched itself, so the routing listener
// passes it straight to the adapter instead of resolving the route again.
const ROUTED = Symbol('opencode-quota-router.routed')
const MAX_STREAM_ATTEMPTS = 3

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
    fallbackOnCapacity: config?.fallbackOnCapacity === true,
    capacityFallbackDelayMs: Number.isFinite(config?.capacityFallbackDelayMs) && config.capacityFallbackDelayMs >= 1000 ? config.capacityFallbackDelayMs : DEFAULT_PROBE_INTERVAL_MS,
    modelQuarantineMs: Number.isFinite(config?.modelQuarantineMs) && config.modelQuarantineMs >= 1000 ? config.modelQuarantineMs : MODEL_QUARANTINE_MS,
    authCooldownMs: Number.isFinite(config?.authCooldownMs) && config.authCooldownMs >= 1000 ? config.authCooldownMs : AUTH_COOLDOWN_MS,
    recoverStableMs: Number.isFinite(config?.recoverStableMs) && config.recoverStableMs >= 1000 ? config.recoverStableMs : RECOVER_STABLE_MS,
    recoveryProbeIntervalMs: Number.isFinite(config?.recoveryProbeIntervalMs) && config.recoveryProbeIntervalMs >= 1000 ? config.recoveryProbeIntervalMs : RECOVERY_PROBE_MS,
    statusUrl: typeof config?.statusUrl === 'string' && config.statusUrl.length > 0 ? config.statusUrl : DEFAULT_STATUS_URL,
    statusRefreshMs: Number.isFinite(config?.statusRefreshMs) && config.statusRefreshMs >= 15_000 ? config.statusRefreshMs : STATUS_REFRESH_MS,
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
    version: 4,
    mode: 'primary',
    reason: 'initial',
    cause: null,
    modeSince: Date.now(),
    until: 0,
    active: null,
    accounts: [],
    quarantine: {},
    usage: null,
    checkedAt: 0,
    updatedAt: Date.now(),
    recovery: emptyRecovery(),
    status: emptyStatus(),
    lastFailure: null,
  }
}

/** The stability window that decides when a recovered upstream gets the traffic back. */
function emptyRecovery() {
  return { stableSince: 0, attempts: 0, lastProbeAt: 0, blocked: null }
}

function normalizeRecovery(raw) {
  if (raw === null || typeof raw !== 'object') return emptyRecovery()
  return {
    stableSince: Number.isFinite(raw.stableSince) && raw.stableSince > 0 ? raw.stableSince : 0,
    attempts: Number.isFinite(raw.attempts) ? raw.attempts : 0,
    lastProbeAt: Number.isFinite(raw.lastProbeAt) ? raw.lastProbeAt : 0,
    // Why the stability window is not advancing: `probe` when the account
    // answered badly, `published` when OpenCode's own feed still reports our
    // model degraded. Persisted so the card keeps the reason across a restart.
    blocked: typeof raw.blocked === 'string' ? raw.blocked : null,
  }
}

/** Per-model request outcomes: the evidence behind the status card. */
function emptyStatus() {
  return { models: {}, recent: [], checkedAt: 0 }
}

function normalizeStatus(raw) {
  const status = emptyStatus()
  if (raw === null || typeof raw !== 'object') return status
  if (raw.models !== null && typeof raw.models === 'object') {
    for (const [model, entry] of Object.entries(raw.models)) {
      if (entry === null || typeof entry !== 'object') continue
      status.models[model] = {
        ok: Number.isFinite(entry.ok) ? entry.ok : 0,
        fail: Number.isFinite(entry.fail) ? entry.fail : 0,
        okStreak: Number.isFinite(entry.okStreak) ? entry.okStreak : 0,
        failStreak: Number.isFinite(entry.failStreak) ? entry.failStreak : 0,
        lastCode: typeof entry.lastCode === 'string' ? entry.lastCode : null,
        lastHttpStatus: Number.isFinite(entry.lastHttpStatus) ? entry.lastHttpStatus : null,
        lastMessage: typeof entry.lastMessage === 'string' ? entry.lastMessage : null,
        lastOkAt: Number.isFinite(entry.lastOkAt) ? entry.lastOkAt : 0,
        lastFailAt: Number.isFinite(entry.lastFailAt) ? entry.lastFailAt : 0,
      }
    }
  }
  if (Array.isArray(raw.recent)) {
    status.recent = raw.recent
      .filter((entry) => entry !== null && typeof entry === 'object' && Number.isFinite(entry.at))
      .slice(-STATUS_HISTORY)
      .map((entry) => ({
        at: entry.at,
        model: String(entry.model ?? ''),
        code: String(entry.code ?? 'error'),
        status: Number.isFinite(entry.status) ? entry.status : null,
      }))
  }
  status.checkedAt = Number.isFinite(raw.checkedAt) ? raw.checkedAt : 0
  return status
}

function normalizeFailure(raw) {
  if (raw === null || typeof raw !== 'object') return null
  return {
    code: String(raw.code ?? 'UNKNOWN'),
    status: Number.isFinite(raw.status) ? raw.status : undefined,
    message: String(raw.message ?? '').slice(0, 400),
    model: typeof raw.model === 'string' ? raw.model : undefined,
    cause: typeof raw.cause === 'string' ? raw.cause : undefined,
    at: Number.isFinite(raw.at) ? raw.at : 0,
  }
}

/**
 * Reduce the public status feed to what the card renders: the overall verdict,
 * one row per service, the per-model rows (with the reason and the live speed)
 * and the incidents that are still open. Unknown shapes degrade to "unknown"
 * instead of throwing, because this feeds a settings page, not a decision.
 */
export function summarizeStatus(raw, now = Date.now()) {
  const services = []
  const models = new Map()
  const components = Array.isArray(raw?.components) ? raw.components : []
  for (const component of components) {
    if (component === null || typeof component !== 'object') continue
    const id = String(component.service ?? 'unknown')
    services.push({
      id,
      status: String(component.status ?? 'unknown'),
      reason: String(component.reason ?? 'unknown'),
      since: Number.isFinite(component.since) ? component.since : 0,
    })
    const breakdown = Array.isArray(component.breakdown) ? component.breakdown : []
    for (const entry of breakdown) {
      if (entry === null || typeof entry !== 'object' || typeof entry.id !== 'string') continue
      const speed = entry.speed !== null && typeof entry.speed === 'object' ? entry.speed : {}
      const row = models.get(entry.id) ?? { id: entry.id, status: 'unknown', reason: 'unknown', services: [], ttft: null, tps: null }
      row.services.push(id)
      if (typeof entry.status === 'string') row.status = entry.status
      if (typeof entry.reason === 'string') row.reason = entry.reason
      if (Number.isFinite(speed.ttft)) row.ttft = speed.ttft
      if (Number.isFinite(speed.tps)) row.tps = speed.tps
      models.set(entry.id, row)
    }
    // A degraded component may name the affected models without a breakdown.
    const named = Array.isArray(component.models) ? component.models : []
    for (const entry of named) {
      if (entry === null || typeof entry !== 'object' || typeof entry.id !== 'string') continue
      const existing = models.get(entry.id)
      if (existing === undefined) {
        models.set(entry.id, {
          id: entry.id,
          status: String(entry.status ?? component.status ?? 'degraded'),
          reason: String(entry.reason ?? component.reason ?? 'unknown'),
          services: [id],
          ttft: null,
          tps: null,
        })
        continue
      }
      if (typeof entry.reason === 'string') existing.reason = entry.reason
      if (typeof entry.status === 'string') existing.status = entry.status
    }
  }
  const active = (Array.isArray(raw?.incidents) ? raw.incidents : [])
    .filter((incident) => incident !== null && typeof incident === 'object' && !Number.isFinite(incident.resolvedAt))
    .map((incident) => ({
      id: String(incident.id ?? ''),
      service: String(incident.service ?? 'unknown'),
      status: String(incident.status ?? 'degraded'),
      reason: String(incident.reason ?? 'unknown'),
      startedAt: Number.isFinite(incident.startedAt) ? incident.startedAt : 0,
      models: (Array.isArray(incident.models) ? incident.models : []).map((entry) => String(entry?.id ?? '')).filter((id) => id.length > 0),
    }))
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 5)
  return {
    updatedAt: Number.isFinite(raw?.updatedAt) ? raw.updatedAt : now,
    since: Number.isFinite(raw?.since) ? raw.since : 0,
    stale: raw?.stale === true,
    status: String(raw?.status ?? 'unknown'),
    services,
    models: Object.fromEntries(models),
    active,
    fetchedAt: now,
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
      version: 4,
      mode: parsed.mode === 'fallback' ? 'fallback' : 'primary',
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'loaded',
      cause: typeof parsed.cause === 'string' ? parsed.cause : null,
      modeSince: Number.isFinite(parsed.modeSince) ? parsed.modeSince : 0,
      until: Number.isFinite(parsed.until) ? parsed.until : 0,
      active,
      accounts,
      quarantine,
      usage: parsed.usage !== null && typeof parsed.usage === 'object' ? parsed.usage : null,
      checkedAt: Number.isFinite(parsed.checkedAt) ? parsed.checkedAt : 0,
      updatedAt: Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : Date.now(),
      recovery: normalizeRecovery(parsed.recovery),
      status: normalizeStatus(parsed.status),
      lastFailure: normalizeFailure(parsed.lastFailure),
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

  // ---- OpenCode's own status feed -----------------------------------------

  const officialPath = `${cfg.statePath.replace(/\.json$/i, '')}-upstream.json`
  let official = readOfficialCache()
  let officialInFlight

  function readOfficialCache() {
    try {
      const parsed = JSON.parse(fs.readFileSync(officialPath, 'utf8'))
      if (parsed === null || typeof parsed !== 'object') return { fetchedAt: 0, data: undefined, error: undefined, errorAt: 0 }
      return {
        fetchedAt: Number.isFinite(parsed.fetchedAt) ? parsed.fetchedAt : 0,
        data: parsed.data !== null && typeof parsed.data === 'object' ? parsed.data : undefined,
        error: typeof parsed.error === 'string' ? parsed.error : undefined,
        errorAt: Number.isFinite(parsed.errorAt) ? parsed.errorAt : 0,
      }
    } catch {
      return { fetchedAt: 0, data: undefined, error: undefined, errorAt: 0 }
    }
  }

  function saveOfficialCache() {
    try {
      fs.mkdirSync(path.dirname(officialPath), { recursive: true })
      const temp = `${officialPath}.${process.pid}.tmp`
      fs.writeFileSync(temp, `${JSON.stringify(official)}\n`, { mode: 0o600 })
      fs.renameSync(temp, officialPath)
    } catch (error) {
      log.warn(`could not persist the upstream status cache: ${describeError(error)}`)
    }
  }

  /**
   * Read `status.opencode.ai/api/status`. It is a public, unauthenticated feed
   * that OpenCode itself refreshes about once a minute, so this is a plain GET
   * with a short cache. Routing never waits for it: a failed fetch only costs
   * the card's freshness.
   */
  function refreshOfficial(force) {
    if (disposed) return Promise.resolve(officialView())
    const now = Date.now()
    if (!force && official.fetchedAt > 0 && now - official.fetchedAt < cfg.statusRefreshMs) return Promise.resolve(officialView(now))
    if (officialInFlight !== undefined) return officialInFlight
    officialInFlight = (async () => {
      try {
        const response = await fetch(cfg.statusUrl, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        if (!response.ok) throw new Error(`status feed answered HTTP ${response.status}`)
        const raw = await response.json()
        official = { fetchedAt: Date.now(), data: summarizeStatus(raw), error: undefined, errorAt: 0 }
        saveOfficialCache()
      } catch (error) {
        official = { ...official, error: describeError(error), errorAt: Date.now() }
        log.warn(`could not read ${cfg.statusUrl}: ${describeError(error)}`)
      } finally {
        officialInFlight = undefined
      }
      return officialView()
    })()
    return officialInFlight
  }

  /** What the Settings card shows about OpenCode's own published status. */
  function officialView(now = Date.now()) {
    const data = official.data
    const fetchedAt = official.fetchedAt
    const age = fetchedAt > 0 ? now - fetchedAt : null
    const models = cfg.routes.map((route) => {
      const id = route.primary.model
      const entry = data?.models?.[id]
      return {
        model: id,
        // OpenCode lists the free variants separately; a Go model that only
        // appears there still describes the same upstream.
        status: entry?.status ?? 'unknown',
        reason: entry?.reason ?? 'unknown',
        service: entry?.services?.[0] ?? null,
        ttftMs: entry?.ttft ?? null,
        tps: entry?.tps ?? null,
      }
    })
    return {
      ok: official.error === undefined && data !== undefined,
      error: official.error ?? null,
      errorAt: official.errorAt,
      url: cfg.statusUrl,
      fetchedAt,
      ageMs: age,
      stale: age === null || age > STATUS_STALE_MS || data?.stale === true,
      status: data?.status ?? 'unknown',
      since: data?.since ?? 0,
      updatedAt: data?.updatedAt ?? 0,
      services: (data?.services ?? []).filter((entry) => entry.id !== 'console' && entry.id !== 'logs'),
      active: data?.active ?? [],
      models,
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

  /**
   * Which upstream condition a raw stream failure stands for. The buckets are
   * the vocabulary the Settings card explains, so every code the adapters and
   * the HTTP layer can produce lands in one of them.
   */
  function classifyFailure(failure) {
    const code = String(failure?.code ?? '').toUpperCase()
    const status = typeof failure?.status === 'number' ? failure.status : 0
    const message = String(failure?.message ?? '')
    const hint = `${code} ${message}`
    if (code === 'MISSING_CREDENTIAL') return 'missing_key'
    if (code === 'ACCOUNT_SIGN_IN_REQUIRED') return 'sign_in'
    if (code === 'CLIENT_UPGRADE_REQUIRED') return 'upgrade'
    if (AUTH_CODES.has(code) || status === 401 || status === 403) return 'auth'
    if (code === 'QUOTA' || code === 'ACCOUNT_QUOTA') return 'quota'
    if (status === 402) return 'payment'
    if (status === 404) return 'not_found'
    if (status === 408 || status === 504 || /TIMEOUT|ETIMEDOUT|timed out/i.test(hint)) return 'timeout'
    if (/context(?:_length| length)|too many tokens|maximum context|input is too long/i.test(message)) return 'context'
    if (/content[_ ]filter|moderation|safety/i.test(message)) return 'filter'
    if (CAPACITY_MESSAGE.test(message) || status === 503 || status === 529) return 'capacity'
    if (status === 400 || status === 422 || /INVALID_REQUEST|BAD_REQUEST/i.test(code)) return 'bad_request'
    if (status >= 500) return 'server'
    if (/ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EPIPE|socket hang up|fetch failed/i.test(hint)) return 'network'
    if (code === 'RATE_LIMIT' || status === 429) return 'rate_limit'
    return 'error'
  }

  /** Whether a failure says anything about the upstream's health at all. */
  function isUpstreamFailure(failure) {
    if (failure === undefined || failure === null) return false
    const code = String(failure.code ?? '').toUpperCase()
    if (AUTH_CODES.has(code)) return true
    if (typeof failure.status === 'number' && failure.status >= 400) return true
    if (CAPACITY_MESSAGE.test(String(failure.message ?? ''))) return true
    return /QUOTA|RATE_LIMIT|TIMEOUT|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EPIPE|socket hang up/i.test(`${code} ${String(failure.message ?? '')}`)
  }

  /** Record one request outcome for a primary model; this is the status evidence. */
  function recordStatus(model, outcome, failure) {
    const now = Date.now()
    const status = state.status ?? (state.status = emptyStatus())
    const entry = status.models[model] ?? (status.models[model] = {
      ok: 0, fail: 0, okStreak: 0, failStreak: 0, lastCode: null, lastHttpStatus: null, lastMessage: null, lastOkAt: 0, lastFailAt: 0,
    })
    if (outcome === 'ok') {
      entry.ok = (entry.ok ?? 0) + 1
      entry.okStreak += 1
      entry.failStreak = 0
      entry.lastOkAt = now
      // The last failure stays on record: a recovered model keeps enough context
      // for its tooltip to explain what went wrong a minute ago.
    } else {
      entry.fail += 1
      entry.failStreak += 1
      entry.okStreak = 0
      entry.lastCode = classifyFailure(failure)
      entry.lastHttpStatus = typeof failure?.status === 'number' ? failure.status : null
      // Keep the provider's own wording: the Settings card explains the code,
      // but the raw text is what makes an unfamiliar error diagnosable.
      entry.lastMessage = String(failure?.message ?? '').slice(0, 240) || null
      entry.lastFailAt = now
      status.recent.push({ at: now, model, code: entry.lastCode, status: entry.lastHttpStatus })
      if (status.recent.length > STATUS_HISTORY) status.recent.splice(0, status.recent.length - STATUS_HISTORY)
    }
    status.checkedAt = now
    state.updatedAt = now
  }

  function recoveryView(now = Date.now()) {
    const recovery = state.recovery ?? emptyRecovery()
    const stableSince = recovery.stableSince > 0 ? recovery.stableSince : 0
    const stableForMs = stableSince > 0 ? Math.max(0, now - stableSince) : 0
    return {
      active: state.mode === 'fallback' && stableSince > 0,
      stableSince,
      stableForMs,
      requiredMs: cfg.recoverStableMs,
      remainingMs: stableSince > 0 ? Math.max(0, cfg.recoverStableMs - stableForMs) : cfg.recoverStableMs,
      attempts: recovery.attempts,
      blocked: recovery.blocked ?? null,
      lastProbeAt: recovery.lastProbeAt,
      probeIntervalMs: cfg.recoveryProbeIntervalMs,
    }
  }

  /** "10 min" / "40 s" — the wording the reason string carries. */
  function durationLabel(ms) {
    const minutes = ms / 60000
    return minutes >= 1 ? `${Math.round(minutes)} min` : `${Math.round(ms / 1000)} s`
  }

  /**
   * One status object for the Settings card: the current verdict, the evidence
   * behind it, and how far the recovery window has come.
   */
  function upstreamView(now = Date.now()) {
    const rank = { auth: 6, quota: 5, payment: 5, missing_key: 5, sign_in: 5, capacity: 4, not_found: 3, context: 3, upgrade: 3, rate_limit: 2, timeout: 2, server: 2, network: 2, bad_request: 1, filter: 1, error: 1, ok: 0 }
    const models = cfg.routes.map((route) => {
      const model = route.primary.model
      const entry = state.status?.models?.[model]
      const quarantineEntry = state.quarantine[model]
      const quarantined = quarantineEntry !== undefined && quarantineEntry.until > now
      const recent = (state.status?.recent ?? []).filter((item) => item.model === model && now - item.at <= STATUS_WINDOW_MS)
      const failedLast = entry !== undefined && entry.lastFailAt > entry.lastOkAt && now - entry.lastFailAt <= STATUS_WINDOW_MS
      // A model that fails and then recovers on retry is still unhealthy: two
      // failures inside the window is the "Degraded" the card is meant to show,
      // even though the retry hid them from the caller.
      const flapping = recent.length >= 2 && now - (entry?.lastFailAt ?? 0) <= STATUS_WINDOW_MS
      let code = 'ok'
      if (quarantined) code = /quota|exhaust/i.test(String(quarantineEntry.reason ?? '')) ? 'quota' : 'error'
      else if (failedLast || flapping) code = entry.lastCode ?? 'error'
      const last = recent.length > 0 ? recent[recent.length - 1] : undefined
      return {
        model,
        provider: route.primary.provider,
        fallback: route.fallback,
        code,
        recentFails: recent.length,
        lastAt: last?.at ?? 0,
        lastStatus: last?.status ?? null,
        lastCode: entry?.lastCode ?? null,
        lastHttpStatus: entry?.lastHttpStatus ?? null,
        lastMessage: entry?.lastMessage ?? null,
        ok: entry?.ok ?? 0,
        fail: entry?.fail ?? 0,
        okStreak: entry?.okStreak ?? 0,
        failStreak: entry?.failStreak ?? 0,
        quarantinedUntil: quarantined ? quarantineEntry.until : 0,
      }
    })
    let worst = 'ok'
    for (const entry of models) if ((rank[entry.code] ?? 0) > (rank[worst] ?? 0)) worst = entry.code
    const recovery = recoveryView(now)
    const evidence = models.some((entry) => entry.ok > 0 || entry.fail > 0)
    let verdict = 'unknown'
    let code = 'unknown'
    if (state.mode === 'fallback') {
      verdict = recovery.stableSince > 0 ? 'recovering' : 'fallback'
      code = typeof state.cause === 'string' && state.cause.length > 0 ? state.cause : (worst === 'ok' ? 'unknown' : worst)
    } else if (worst !== 'ok') {
      verdict = 'degraded'
      code = worst
    } else if (evidence) {
      verdict = 'healthy'
      code = 'ok'
    }
    return {
      state: verdict,
      code,
      mode: state.mode,
      cause: state.cause ?? null,
      since: state.modeSince > 0 ? state.modeSince : state.updatedAt,
      checkedAt: state.status?.checkedAt ?? 0,
      windowMs: STATUS_WINDOW_MS,
      lastFailure: state.lastFailure ?? null,
      recovery,
      models,
      recent: (state.status?.recent ?? []).slice(-STATUS_HISTORY),
    }
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

  /** When the next probe fires while the router sits in fallback. */
  function probeDelay(now) {
    const usage = activeAccount()?.usage
    if (usage !== undefined && usage !== null && isExhausted(usage)) {
      // An exhausted window is only worth re-reading at its reset.
      return Math.max(now + cfg.recoveryProbeIntervalMs, retryAfter(usage, now, cfg.probeIntervalMs))
    }
    return now + cfg.recoveryProbeIntervalMs
  }

  /**
   * One observation pass: refresh every account's usage, fail over if the active
   * account went away, and — while in fallback — advance the stability window
   * that decides when OpenCode gets the traffic back.
   */
  async function refreshStatus(options = {}) {
    if (disposed) return false
    expireQuarantine()
    // Both halves of the card refresh together, so one click never leaves the
    // published status older than the probe result next to it.
    await refreshOfficial(options.force === true)
    if (disposed) return false
    await probeAll({ force: options.force !== false })
    if (disposed) return false
    const now = Date.now()
    const active = activeAccount()
    const activeBlocked = active === undefined || active.enabled === false || active.exhaustedUntil > now
    if (activeBlocked) {
      const next = usableAccount(now)
      if (next !== undefined) await switchTo(next, `failover: ${active === undefined ? 'no account' : active.id} unavailable`)
    }
    if (state.mode !== 'fallback') {
      if ((state.recovery?.stableSince ?? 0) > 0) state.recovery = emptyRecovery()
      schedule()
      return true
    }
    const recovery = state.recovery ?? (state.recovery = emptyRecovery())
    recovery.lastProbeAt = now
    // Recovery goes back to the account the router is already using — a probe
    // that succeeded is no reason to rotate keys — and only falls back to "the
    // first usable account" when the active one is not usable any more.
    const current = activeAccount()
    const candidate = current !== undefined && current.enabled !== false && current.exhaustedUntil <= now
      ? current
      : usableAccount(now)
    // A probe that failed (HTTP error, no credential, exhausted window) leaves
    // `lastError` behind; only a candidate that just answered cleanly counts.
    const healthy = candidate !== undefined && candidate.lastError === undefined && candidate.checkedAt > 0
    // A probe proves the allowance is readable, not that inference is being
    // served — a rate-limited upstream answers the usage endpoint perfectly
    // well. OpenCode publishes the serving verdict, so a recovery the feed still
    // calls degraded does not count. When the feed itself is unreachable the
    // probe is all we have, and that is better than never switching back.
    const published = officialView(now)
    const publishedBad = published.ok && (published.status === 'outage' || published.status === 'maintenance'
      || published.models.some((entry) => entry.status !== 'operational' && entry.status !== 'unknown'))
    const ready = healthy && !publishedBad
    if (!ready) {
      const restarted = recovery.stableSince > 0
      recovery.stableSince = 0
      recovery.attempts += 1
      recovery.blocked = healthy ? 'published' : 'probe'
      state.until = probeDelay(now)
      state.updatedAt = now
      saveState()
      if (restarted) {
        log.info(healthy
          ? 'OpenCode answers probes but its published status still reports our model degraded; the stability window restarted'
          : 'OpenCode probe failed again; the stability window restarted')
      }
      schedule()
      return false
    }
    if (recovery.blocked !== null) recovery.blocked = null
    if (recovery.stableSince === 0) {
      recovery.stableSince = now
      log.info(`OpenCode answered a probe; watching ${Math.round(cfg.recoverStableMs / 60000)} min of clean probes before switching back`)
    }
    const stableFor = now - recovery.stableSince
    if (stableFor < cfg.recoverStableMs) {
      state.until = now + cfg.recoveryProbeIntervalMs
      state.updatedAt = now
      saveState()
      schedule()
      return false
    }
    const reason = `stable for ${durationLabel(cfg.recoverStableMs)}`
    await switchTo(candidate, reason)
    resume(reason)
    schedule()
    return true
  }

  async function runProbe() {
    if (disposed) return
    await refreshStatus({ force: true })
  }

  function planFallback(reason, failure, delayMs, cause = 'unknown', model) {
    const now = Date.now()
    const entering = state.mode !== 'fallback'
    state.mode = 'fallback'
    state.reason = reason
    state.cause = cause
    state.until = now + Math.max(cfg.minProbeDelayMs, delayMs)
    if (entering) {
      // A fresh fallback starts with no credit: the stability window only opens
      // after a probe of the new state comes back healthy.
      state.modeSince = now
      state.recovery = emptyRecovery()
    }
    state.lastFailure = failure === undefined
      ? state.lastFailure ?? null
      : {
          code: String(failure.code ?? 'UNKNOWN'),
          status: typeof failure.status === 'number' ? failure.status : undefined,
          message: String(failure.message ?? '').slice(0, 400),
          model: typeof model === 'string' ? model : undefined,
          cause,
          at: now,
        }
    state.updatedAt = now
    saveState()
    schedule()
    log.warn(`plan-wide fallback (${reason}, ${cause}); next probe in ~${Math.round(Math.max(cfg.minProbeDelayMs, delayMs) / 60000)} min`)
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
    state.cause = null
    state.modeSince = Date.now()
    state.until = 0
    state.quarantine = {}
    state.recovery = emptyRecovery()
    // Switching back is itself the evidence, so the marks that made the card
    // read "degraded" stop describing the upstream. The 30-minute failure
    // history stays: it is a log, not a verdict.
    for (const entry of Object.values(state.status?.models ?? {})) {
      entry.lastFailAt = 0
      entry.lastCode = null
      entry.lastHttpStatus = null
      entry.lastMessage = null
      entry.failStreak = 0
    }
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

  /** The primary or fallback side of one configured route pair. */
  function targetFor(route, side) {
    return side === 'primary' ? route.primary : route.fallback
  }

  /** Whether this request is being sent to the pair's primary model. */
  function isPrimaryAttempt(options, route) {
    return options.provider === route.primary.provider && options.model === route.primary.model
  }

  /**
   * Re-dispatch a request at another route. The marker keeps this plugin's own
   * `llm/stream` listener from resolving the route again, which would otherwise
   * bounce between the two sides forever.
   */
  function rerouted(options, target, reasoningEffort) {
    const { reasoningEffort: _dropped, ...rest } = options
    return {
      ...rest,
      provider: target.provider,
      model: target.model,
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
      [ROUTED]: true,
    }
  }

  /**
   * Decide what a failed primary attempt should do next: retry the same route
   * after account failover (`'same'`), move to the route's fallback side
   * (`'fallback'`), or let the failure propagate (`undefined`).
   */
  async function recoverStream(route, failure) {
    if (failure === undefined || failure === null) return undefined
    const code = String(failure.code ?? '').toUpperCase()

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
        return { kind: 'same' }
      }
      planFallback(`OpenCode authentication failed (${code})`, failure, cfg.unconfirmedDelayMs, 'auth', route.primary.model)
      return { kind: 'fallback' }
    }

    const hard = code === 'QUOTA' || code === 'ACCOUNT_QUOTA'
    const soft = code === 'RATE_LIMIT' || failure.status === 429
    if (!hard && !soft) return undefined

    await probeAll({ force: true })
    const now = Date.now()
    const current = activeAccount()
    const currentBlocked = current === undefined || current.enabled === false || current.exhaustedUntil > now
    const alternative = usableAccount(now)
    const quoted = QUOTA_MESSAGE.test(String(failure.message ?? ''))

    // Another account still has allowance: switch to it and retry the model.
    if (currentBlocked && alternative !== undefined && alternative.id !== current?.id) {
      await switchTo(alternative, `quota failover from ${current?.id ?? 'none'}`)
      return { kind: 'same' }
    }

    const usage = current?.usage ?? state.usage
    const usageExhausted = usage !== undefined && usage !== null && isExhausted(usage)

    // A capacity/overload refusal is not a quota problem: the allowance is
    // intact, but the provider's serving cell is full. When enabled, go to the
    // fallback subscription instead of letting the provider retry policy burn
    // its whole budget against a full cell.
    if (soft && cfg.fallbackOnCapacity && !usageExhausted && CAPACITY_MESSAGE.test(String(failure.message ?? ''))) {
      planFallback('OpenCode upstream capacity/overload', failure, cfg.capacityFallbackDelayMs, 'capacity', route.primary.model)
      return { kind: 'fallback' }
    }

    // A transient rate limit with room left belongs to the provider retry policy.
    if (!hard && !usageExhausted && !quoted) return undefined

    if (alternative === undefined) {
      const delay = usage === undefined ? cfg.unconfirmedDelayMs : Math.max(cfg.minProbeDelayMs, nextProbeAt(usage, Date.now(), cfg.probeIntervalMs) - Date.now())
      planFallback(hard ? 'every OpenCode account is out of allowance' : 'OpenCode quota window exhausted', failure, delay, 'quota', route.primary.model)
      return { kind: 'fallback' }
    }

    const model = route.primary.model
    const delay = usage === undefined ? cfg.modelQuarantineMs : Math.max(cfg.minProbeDelayMs, nextProbeAt(usage, Date.now(), cfg.probeIntervalMs) - Date.now())
    quarantineModel(model, hard ? 'reported quota exhaustion' : 'quota window exhausted', Date.now() + Math.min(delay, cfg.modelQuarantineMs))
    return { kind: 'fallback' }
  }

  /**
   * Forward one adapter stream. A primary attempt that fails before yielding
   * any chunk may be retried on another account or on the fallback route; after
   * the first chunk the failure belongs to the caller and is passed through.
   */
  async function* relay(stream, route, options, attempt, recoverable) {
    let chunks = 0
    for await (const chunk of stream) {
      if (chunk.type === 'finish') {
        const failed = chunk.reason?.kind === 'error'
        // Only the primary side says anything about OpenCode's health; a fallback
        // attempt failing belongs to the fallback provider.
        if (isPrimaryAttempt(options, route)) {
          if (failed) {
            if (isUpstreamFailure(chunk.reason.failure)) {
              recordStatus(route.primary.model, 'fail', chunk.reason.failure)
              saveState()
            }
          } else {
            recordStatus(route.primary.model, 'ok')
          }
        }
        if (recoverable && !disposed && !lifetime.signal.aborted && attempt < MAX_STREAM_ATTEMPTS && chunks === 0 && failed) {
          let action
          try {
            action = await recoverStream(route, chunk.reason.failure)
          } catch (error) {
            log.warn(`stream recovery failed: ${describeError(error)}`)
          }
          if (action?.kind === 'same') {
            log.info(`retry ${options.provider}/${options.model} after ${String(chunk.reason.failure?.code ?? 'error')}`)
            const same = { provider: options.provider, model: options.model }
            yield* relay(ctx.llm.stream(rerouted(options, same, options.reasoningEffort)), route, options, attempt + 1, true)
            return
          }
          if (action?.kind === 'fallback') {
            const target = route.fallback
            if (providerRegistered(target.provider)) {
              const reasoningEffort = await effortFor(target, options.reasoningEffort)
              log.info(`route retry -> fallback: ${target.provider}/${target.model}${reasoningEffort === undefined ? '' : ` @ ${reasoningEffort}`}`)
              yield* relay(ctx.llm.stream(rerouted(options, target, reasoningEffort)), route, options, attempt + 1, false)
              return
            }
          }
        }
        yield chunk
        return
      }
      chunks += 1
      yield chunk
    }
  }

  /**
   * Move the Session's recorded selection to the side quota state prefers
   * before the next step captures it. Same-step failures are still relayed by
   * `llm/stream`; this keeps the durable request header and the assistant
   * source aligned in the common case.
   */
  function alignSelection(agent) {
    if (disposed || lifetime.signal.aborted) return
    try {
      refreshStateFromDisk()
      expireQuarantine()
      const current = agent?.model?.current?.()
      if (current === undefined) return
      const match = matchRoute(current)
      if (match === undefined) return
      const desired = primaryBlocked(match.route) ? 'fallback' : 'primary'
      const target = targetFor(match.route, desired)
      if (target.provider === current.provider && target.model === current.model) return
      if (!providerRegistered(target.provider)) return
      agent.model.select(target)
    } catch (error) {
      log.warn(`could not align the model selection: ${describeError(error)}`)
    }
  }

  /**
   * Resolve the route for one streaming call before dispatch. The model is
   * fixed for a step, so `llm/stream` is the seam where quota state can still
   * choose the primary or fallback side and account failover can be applied.
   */
  async function* routeStream(options, next) {
    if (options === null || typeof options !== 'object' || options[ROUTED] === true || disposed || lifetime.signal.aborted) {
      yield* next()
      return
    }
    let plan
    try {
      refreshStateFromDisk()
      expireQuarantine()
      const match = matchRoute(options)
      if (match !== undefined) {
        const desired = primaryBlocked(match.route) ? 'fallback' : 'primary'
        plan = { match, desired }
      }
    } catch (error) {
      log.warn(`could not resolve the request route: ${describeError(error)}`)
    }
    if (plan === undefined) {
      yield* next()
      return
    }
    const { match, desired } = plan
    if (desired === 'primary') {
      const mirrored = await mirrorActive(false)
      if (!mirrored || !hasKey) {
        yield* next()
        return
      }
    }
    if (match.side === desired) {
      yield* forward(next(), match.route, options, desired === 'primary')
      return
    }
    const target = targetFor(match.route, desired)
    if (!providerRegistered(target.provider)) {
      yield* next()
      return
    }
    const reasoningEffort = await effortFor(target, options.reasoningEffort)
    log.info(`route ${match.side} -> ${desired}: ${target.provider}/${target.model}${reasoningEffort === undefined ? '' : ` @ ${reasoningEffort}`}`)
    const dispatched = rerouted(options, target, reasoningEffort)
    yield* forward(ctx.llm.stream(dispatched), match.route, dispatched, desired === 'primary')
  }

  /**
   * Forward one dispatched stream and, if it failed *after* producing output, let
   * the quota plan move anyway.
   *
   * A late failure cannot be retried inside `relay` — the caller already received
   * those tokens, and replaying them would duplicate the answer. But leaving the
   * plan untouched is worse: the agent retries the step, `primaryBlocked()` still
   * says primary, and the retry walks into the same wall. Planning here means the
   * retry lands on the fallback side, so the step continues one attempt later.
   */
  async function* forward(stream, route, options, recoverable) {
    let sawOutput = false
    let failure
    for await (const chunk of relay(stream, route, options, 0, recoverable)) {
      if (chunk.type === 'finish') {
        if (chunk.reason?.kind === 'error') failure = chunk.reason.failure
      } else {
        sawOutput = true
      }
      yield chunk
    }
    // `relay` already moved the plan when it could retry; only a stream that got
    // past its first chunk and is still on primary needs the late decision.
    if (sawOutput && failure !== undefined && recoverable && state.mode !== 'fallback') {
      try {
        await recoverStream(route, failure)
      } catch (error) {
        log.warn(`could not plan around a late stream failure: ${describeError(error)}`)
      }
    }
  }

  const disposeRoute = ctx.on('llm/stream', (options, next) => {
    try {
      return routeStream(options, next)
    } catch (error) {
      log.warn(`could not route the model request: ${describeError(error)}`)
      return next()
    }
  }, { prepend: true })

  const disposeSelection = [
    ctx.on('agent/created', ({ agent }) => alignSelection(agent)),
    ctx.on('agent/status', ({ agent, status }) => {
      if (status === 'running') alignSelection(agent)
    }),
    ctx.on('agent/pre-step', async (payload, next) => {
      const decision = await next()
      if (decision.kind === 'enter') alignSelection(payload.agent)
      return decision
    }),
  ]

  ctx.effect(() => () => {
    disposed = true
    disposeRoute()
    for (const dispose of disposeSelection) dispose()
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
      // Nothing is quarantined right now, but the periodic probe still runs: report
      // when it will fire instead of leaving the page showing a dash.
      return marks.length > 0 ? Math.min(...marks) : now + cfg.probeIntervalMs
    })()
    return {
      version: 4,
      mode: state.mode,
      reason: state.reason,
      cause: state.cause ?? null,
      until: state.until,
      active: active?.id ?? null,
      activeLabel: active?.label ?? null,
      updatedAt: state.updatedAt,
      checkedAt: state.checkedAt,
      nextProbeAt: next,
      probeIntervalMs: cfg.probeIntervalMs,
      usage: active?.usage ?? state.usage,
      upstream: upstreamView(now),
      official: officialView(now),
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
      if (only === undefined) {
        // A whole-pool probe is also an observation for the recovery window.
        await refreshStatus({ force: true })
        return { ok: true }
      }
      await probeAll({ force: true, only })
      state.status.checkedAt = Date.now()
      state.updatedAt = Date.now()
      saveState()
      return { ok: true }
    }

    if (action === 'status') {
      // The card's refresh button: read the upstream now instead of waiting for
      // the next scheduled probe. In fallback this also advances the stability
      // window, so a recovery is picked up as soon as it is real.
      await refreshStatus({ force: true })
      state.status.checkedAt = Date.now()
      state.updatedAt = Date.now()
      saveState()
      schedule()
      return { ok: true }
    }

    if (action === 'fallback') {
      planFallback('manual fallback in Settings', undefined, cfg.probeIntervalMs, 'manual')
      return { ok: true }
    }

    if (action === 'primary') {
      resume('manual primary in Settings')
      schedule()
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
      if (request.method === 'GET') {
        // Settings can ask for one account's key so "edit key" opens with the
        // current value filled in. Local-only endpoint, never in the snapshot.
        const url = new URL(request.url ?? '/', 'http://127.0.0.1')
        const reveal = url.searchParams.get('key')
        if (reveal !== null) {
          const account = state.accounts.find((entry) => entry.id === reveal)
          if (account === undefined) throw new Error(`没有账户 ${reveal}`)
          sendJson(response, 200, { id: account.id, key: (await accountKey(account)) ?? null })
          return
        }
      }
      if (request.method === 'POST') {
        const text = await readBody(request)
        let body
        try {
          body = text.length === 0 ? {} : JSON.parse(text)
        } catch {
          throw new Error('请求体不是合法 JSON')
        }
        await applyAction(body)
      } else {
        // Opening the page must never block on the network, but it is the one
        // moment where a stale published status is worth refreshing.
        void refreshOfficial(false)
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
      // The published status is not required for routing, so it lands last and
      // a failure stays inside the card.
      void refreshOfficial(true)
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
