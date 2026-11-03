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
import { apply as applyUsage, isChinaHoliday, peakMultiplier, peakSnapshot } from './usage.js'

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
const llm = {
  listProviders: () => [{ id: 'opencode-go' }, { id: 'deepseek-account' }, { id: 'opencode-free' }],
  resolveModelInfo: async (provider, model) => ({
    reasoning: {
      efforts: provider === 'opencode-go' ? [{ id: 'low' }, { id: 'high' }, { id: 'max' }] : [{ id: 'off' }, { id: 'low' }],
    },
  }),
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
}, { routes, usageUrl, statePath, probeIntervalMs: 1200, minProbeDelayMs: 1000, unconfirmedDelayMs: 1000, modelQuarantineMs: 2500 })

const ask = listeners.get('agent/request')
const fail = listeners.get('agent/request-error')
let headerModel = 'deepseek-v4-pro'
const agent = { id: 's1', session: { requestHeader: () => ({ config: { provider: 'opencode-go', model: headerModel } }) } }
const call = (config) => ask({ agent, turn: 1, step: 1, signal: new AbortController().signal }, async () => config)
const crash = (provider, failure) => fail({ agent, turn: 1, step: 1, provider, failure, signal: new AbortController().signal }, async () => undefined)
const readState = () => JSON.parse(fs.readFileSync(statePath, 'utf8'))
const flash = { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'off' }
const pro = { provider: 'deepseek-account', model: 'deepseek-v4-pro', reasoningEffort: 'low' }

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
assert.equal((await call(flash)).provider, 'opencode-go')
{
  const state = readState()
  assert.equal(state.version, 3)
  assert.equal(state.accounts.length, 1, 'the configured key is adopted as the first account')
  assert.equal(state.accounts[0].keyRef, 'OPENCODE_API_KEY_A1')
  assert.equal(store.get('OPENCODE_API_KEY_A1'), 'oc_sk_test')
}
console.log('router startup ok')

// per-model quarantine keeps the plan for the other models
headerModel = 'deepseek-v4-pro'
assert.deepEqual(await crash('opencode-go', { code: 'QUOTA', status: 429, message: 'usage limit reached' }), { kind: 'retry' })
{
  assert.equal((await call(flash)).provider, 'opencode-go', 'Flash keeps the plan while Pro is quarantined')
  const routed = await call(pro)
  assert.equal(routed.provider, 'deepseek-account')
  assert.equal(readState().mode, 'primary')
}
await sleep(3200)
assert.equal((await call(pro)).provider, 'opencode-go')
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
headerModel = 'deepseek-v4.1-flash'
assert.deepEqual(await crash('opencode-go', { code: 'QUOTA', status: 429, message: 'usage limit reached' }), { kind: 'retry' })
{
  const state = readState()
  assert.equal(state.active, 'a2', 'the spent account hands over to the backup')
  assert.equal(state.mode, 'primary', 'an account failover is not a plan-wide fallback')
  assert.equal(store.get('OPENCODE_API_KEY'), 'oc_sk_backup', 'the active key is mirrored into the provider reference')
  assert.equal((await call(flash)).provider, 'opencode-go')
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
headerModel = 'deepseek-v4.1-flash'
await crash('opencode-go', { code: 'QUOTA', status: 429, message: 'usage limit reached' })
{
  assert.equal(readState().mode, 'fallback', 'no usable account left: every primary model falls back')
  assert.equal((await call(flash)).provider, 'deepseek-account')
  const reset = await api('POST', { action: 'reset' })
  assert.equal(reset.body.mode, 'primary')
  // Nothing is quarantined after a reset, but the periodic probe still has a
  // next run: the page must show a time instead of a dash.
  assert.equal(typeof reset.body.nextProbeAt, 'number', 'nextProbeAt is a timestamp, not null')
  assert.ok(reset.body.nextProbeAt > Date.now(), 'nextProbeAt is in the future')
  assert.equal((await call(flash)).provider, 'opencode-go')
}
console.log('plan-wide fallback ok')

exhaustedKeys.clear()
assert.equal(await crash('deepseek-account', { code: 'QUOTA', message: 'no' }), undefined, 'other providers are never claimed')
assert.equal(await crash('opencode-go', { code: 'RATE_LIMIT', status: 429, message: 'slow down' }), undefined, 'a plain rate limit stays with the provider')
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

for (const dispose of disposers) await dispose()
server.close()
console.log('all accounts checks passed')
