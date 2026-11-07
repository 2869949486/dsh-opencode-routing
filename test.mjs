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
import { apply as applyRouter, isExhausted, maskKey, nextProbeAt, retryAfter } from './router.js'
import { apply as applyUsage, isChinaHoliday, parseGoDocs, peakClock, peakMultiplier, peakSnapshot } from './usage.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
const server = http.createServer((request, response) => {
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
const adapterStream = (options) => (async function* () {
  if (primaryFailure !== undefined && options.provider === 'opencode-go' && options.model === primaryFailure.model) {
    const failure = primaryFailure.failure
    primaryFailure = undefined
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
}, { routes, usageUrl, statePath, probeIntervalMs: 1200, minProbeDelayMs: 1000, unconfirmedDelayMs: 1000, modelQuarantineMs: 2500, fallbackOnCapacity: true, capacityFallbackDelayMs: 60000 })

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
  assert.equal(state.version, 3)
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
  probes.clear()
  const probed = await api('POST', { action: 'probe', id: 'a1' })
  assert.equal(probed.status, 200)
  assert.equal(probes.get('oc_sk_test'), 1, 'the idle account was probed')
  assert.equal(probes.get('oc_sk_backup') ?? 0, 0, 'the other account was left alone')
  const all = await api('POST', { action: 'probe' })
  assert.equal(all.status, 200)
  assert.equal(probes.get('oc_sk_test'), 2)
  assert.equal(probes.get('oc_sk_backup'), 1)
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

for (const dispose of disposers) await dispose()
server.close()
console.log('all accounts checks passed')
