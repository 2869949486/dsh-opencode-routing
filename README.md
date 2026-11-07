# dsh-opencode-routing

[English](README.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Русский](README.ru.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) plugin that merges two earlier plugins
into one package: an **OpenCode account pool with automatic A→B failover and quota routing**, plus a
**per-account / per-model usage dashboard**. Both live on a single Settings page, "OpenCode 账户与用量".

- **Client**: one `settings.section`, refreshed every 60 s; accounts can be added, edited, reordered and probed;
  model cards carry capability tags; both tables pan by dragging; the UI speaks 10 languages (browser language wins).
- **Host**: two endpoints — `GET /opencode-usage.json` (usage, `?refresh=1` forces a refresh) and
  `GET|POST /opencode-quota-router.json` (pool and routing; actions below).

## Install

```bash
npm i dsh-opencode-routing
```

The package ships its own `cordis.patch.yml`: it declares the `opencode-go` / `opencode-free` providers and a
**single** insert (`id: opencode-router`). The `usage:` and `router:` sub-objects hold each half's settings (both
halves own a `path`, so they cannot share one flat namespace).

```yaml
- insert:
    - id: opencode-router
      name: 'dsh-opencode-routing'
      config:
        usageUrl: https://opencode.ai/inference/go/v1/usage
        apiKeyRef: OPENCODE_API_KEY
        usage:
          path: /opencode-usage
          plan: go
        router:
          path: /opencode-quota-router
          routes:
            - primary: { provider: opencode-go, model: deepseek-v4.1-flash }
              fallback: { provider: deepseek-account, model: deepseek-flash }
```

Top-level keys apply to both halves (`usageUrl`, `apiKeyRef`, `probeIntervalMs`, …); keys inside a sub-object only
override that half.

### DSH compatibility

- **dsh >= 0.2.0-rc.1** — every streaming call is routed through the public `llm/stream` waterfall.
- **dsh >= 0.2.2-rc.1** — routing additionally aligns the Session's recorded model selection before each step
  (`agent.model.select()`), so the durable request header and assistant source follow the chosen side.
- Older builds skip the alignment automatically; there is no version switch or extra configuration.

## Account pool and failover

Pool order is usage order. Exactly one account is "current" at any time, and its key is mirrored into the credential
reference the provider reads (default `OPENCODE_API_KEY`). Switching accounts therefore needs no provider config
change: `resolveApiKey` runs on every streaming call, after the `llm/stream` router selects the account.

- **A runs dry, B takes over**: on `QUOTA` / `ACCOUNT_QUOTA` / 429 once the official allowance is confirmed spent, or
  on an auth-class error (`AUTH`, `INVALID_CREDENTIAL`, `MISSING_CREDENTIAL`, `ACCOUNT_SIGN_IN_REQUIRED`,
  `CLIENT_UPGRADE_REQUIRED`), the current account is marked unusable (until the window resets, or for 30 minutes on
  auth failure), routing moves to the next enabled account and **retries the same step** — the turn is never downgraded.
- **Single-model quarantine**: when only one model is out of allowance and the pool still has budget, only that model
  is quarantined (30 minutes by default); every other model keeps using the plan.
- **Whole pool dry**: only then does the route fall back to its `fallback` (DeepSeek account by default), with a
  zero-token `GET /inference/go/v1/usage` probe every 30 minutes (or at the rolling window reset) that returns to the
  plan automatically.
- **Upstream capacity/overload**: with `router.fallbackOnCapacity: true`, a 429 whose message matches
  `overloaded` / `at capacity` / `prefill_cap_refused` / `ttft_admission_refused` falls back to the official
  subscription even while the allowance is intact. The first probe after that fallback runs after
  `router.capacityFallbackDelayMs` (60 s), because a capacity refusal clears in seconds to minutes. The Settings page
  has a **Switch to the official subscription / Switch back to OpenCode** button; the same actions are available as
  `POST /opencode-quota-router.json {"action":"fallback"}` and `{"action":"primary"}`.
- **A failure mid-step does not lose the step**: the retry happens inside the same `llm/stream` call, so only a
  primary attempt that has not produced a single chunk is rerouted. Once the first token is out, the stream belongs
  to the caller and its failure is passed through unchanged (a half-written answer is never silently restarted) —
  but the plan still moves, so the step *retry* lands on the official subscription instead of walking into the same
  wall. Later steps follow the route through `agent.model.select()` alignment.
- **Recovery needs ten clean minutes**: while in fallback the router probes every `router.recoveryProbeIntervalMs`
  (60 s), and only hands the traffic back after `router.recoverStableMs` (10 min) of *consecutive* successful probes.
  One failed probe resets the window to zero. This is what stops a flapping upstream from switching back and forth on
  every other request. A probe only proves the *allowance* endpoint answers — a rate-limited upstream answers it
  perfectly well — so the window also requires OpenCode's published status to stop reporting our model as degraded
  (`recovery.blocked = "published"` says that is what is holding it). When the feed itself is unreachable the probe
  is all there is, and the window proceeds.
- **Reset**: "重置封禁标记" in Settings clears every exhausted/auth mark and returns to the pool immediately. Accounts and
  keys are untouched.

## Official status (status.opencode.ai)

OpenCode publishes the same verdict its status page shows as JSON: `GET https://status.opencode.ai/api/status`,
no authentication, refreshed about once a minute. It carries the overall verdict, one row per plan (Console, logs,
inference, Go, pay-as-you-go, free inference), one row per model with the **reason** and the live speed, and every
incident with its start time. The plugin reads it directly (Host side, cached for `router.statusRefreshMs`, 60 s
by default) and puts it beside the local probe in **one** upstream status card — probe on the left, published verdict
on the right, one refresh button in the head. The two cards of the previous version covered the same ground and are now
merged:

- **The verdict chip** — 正常 / 降级 / 中断 / 维护 — with a tooltip that says what it means *for you*: an
  `upstream` reason reads *"the upstream provider is degraded — not your key and not your allowance, switch to the
  official subscription and keep working"*, because that is the actionable form of a Degraded badge.
- **One row per model**: each route's primary model is listed once. The bare chip is what the local probe saw (classified
  code, failure count, HTTP status, quarantined until), and an 「官方 …」 chip right after it is what the published feed
  says about the same model, followed by OpenCode's own first-token latency and throughput. The previous version had a
  local list *and* a published list saying the same thing twice; a model the feed does not list still says so.
- **Explanations only when something is wrong**: while the probe is green and the feed is normal, the "everything is
  fine" sentence inside each half is not rendered — the chip already said it.
- **Open incidents** show up only when there are some; an empty list is silence, not a row of filler.
- **刷新官方状态** re-reads the feed (and the local probe) on demand; the page also re-reads it every 60 s while it
  is open, so the badge tracks the upstream instead of the last page load.
- **打开状态页** opens `status.opencode.ai` when the tooltip is not enough.
- **When it offers to switch**: only an outright outage, or a *model you actually use* that is not operational,
  shows the 「切到官方订阅」 button. A Go plan marked degraded while your model stays operational does not — the
  feed is telling you the outage is next door, and switching would burn official quota for nothing.
- **A green probe is not enough to come back**: while the published feed still marks the model degraded, the
  ten-clean-minute recovery window does not even start; the tooltip says which half is holding it back
  (`recovery.blocked`: `probe` or `published`).

This is the difference between "my requests are failing" and "OpenCode says Go is degraded because of an upstream
provider": the local probe knows *that* it failed, the published feed knows *why*, and only the second one tells you
whether switching to the official subscription would help.

### Trimming the page (2.10.0)

The first screen keeps only "which route", "how is the upstream", "how much allowance": everything else folds or
de-duplicates.

- **Add an account** folds away — a key is entered once, it should not hold a third of the screen forever.
- **The price table** folds under the verdict: the headline ("OpenCode is 89% cheaper") stays visible, the peak/off-peak,
  cache-hit and output rows open on demand.
- **The route card** drops the mode badge the banner already shows, and its two footnotes become one.
- **The failure record** stays on the page only while the probe is unhealthy; once recovered it no longer sits there as
  noise.

## Page header: which route is answering

The first row of the Settings page is a narrow banner (520px at most), and it answers "whose money did the sentence I just
sent spend":

- **First line** — 「当前路由」 plus **one of two values**: 「OpenCode 账户池」 or 「DeepSeek 官方订阅」, green for the pool
  and amber for the subscription, with the next-probe countdown on the right.
- **Second line, one sentence** — on the pool it names the active account and says no subscription allowance is spent; on
  the subscription it says the official API is being billed and that the router moves back once OpenCode is stable. It is
  clamped to a single line and truncated with an ellipsis; hover for the full text. The banner states the fact, it does not
  unfold it.
- **The reason is not here** — the status card below carries it (*out of allowance, using the official API for now*).
  Repeating it in the banner only made the banner taller than the thing it announces.
- The router control card also dropped its *active account / next probe / status* stats: the banner already shows all three.

## Switch notice (frame overlay)

An automatic switch — in either direction — drops a notice in the top-left corner of the main UI, under the logo, so
nobody has to sit on the Settings page to find out:

- **Opaque panel with a shadow**: solid background, no translucency, and it clears the DSH logo and the shell's own
  quota strip.
- **Timestamped** — 「22:31:05 切换」 uses the local clock, so it lines up with the logs.
- **Dismissed only by ✕** — it never fades out and never asks for confirmation; up to three stack, oldest yields.
- **The body is the reason**, not the enum, e.g. *OpenCode upstream capacity/overload, using the official API for now*.

It reads the same `GET /opencode-quota-router.json` every 20 seconds and only reacts to a change of `mode`, so the
first poll after a page load is not treated as a switch and refreshing never fabricates a notice.

## Upstream status card

The Settings page opens with one status card for the upstream itself — local probe on the left, OpenCode's published
verdict on the right, one refresh button in the shared head — above the account and model tables:

- **Two verdict chips** — the local probe (正常 / 降级 (Degraded) / 回退中 / 恢复观察 / 未知) and the published one
  (正常 / 降级 / 中断 / 维护, rendered as 「官方 降级」). Hovering either (and the model pills below) explains in one
  sentence what that state means and what to do about it, e.g. *rate limited — wait 1–10 minutes, use
  another account, or switch to the official subscription and keep working*.
- **刷新** re-reads every account's usage and re-probes the upstream (`POST {"action":"status"}`). Opening the page
  never probes, so the card shows the snapshot as of the last check.
- **One row per model**: the classified code, how many failures happened this round, the HTTP status, and whether the
  model is quarantined. The last raw upstream message is kept for the tooltip.
- **The recovery countdown**: while in fallback the card shows the progress bar towards the ten clean minutes, so
  "when do I get the plan back" has an actual number. A failed probe restarts the bar.
- **错误码与解决办法**: a collapsible table listing every code the card can show, with the fix for each — rate limit,
  capacity, quota, payment, auth, missing key, sign-in, client upgrade, model unavailable, bad request, context
  overflow, timeout, server error, network error, content filter, and the unknown bucket.

The verdict is deliberately sticky: two failures inside the 30-minute window read as 降级 even when a retry has
already succeeded, because a model that fails and recovers on retry is exactly the flapping this card is meant to
surface. Switching back to the pool (automatically or by hand) clears the marks and starts a fresh round.


## Usage dashboard

The official `/inference/go/v1/usage` endpoint only returns rounded rolling / weekly / monthly percentages and
**no per-model breakdown**, while the plan meters each model separately (5 h = 20 % of the monthly allowance, week =
50 %, month = 100 %). So the page shows two sets of numbers:

- **Official percentages** (one line per account): straight from the API — real account usage, including other
  clients and other machines.
- **Per-model money** (model table): a local estimate. It rescans `$DSH_HOME/sessions` for the last 40 days and only
  counts `assistant/message` events whose provider starts with `opencode`, priced at the public rates (including
  DeepSeek's 2× peak window). Usage from other tools has no local record.

"查看用量" opens a per-account dialog with the three windows, their reset times and the probe result (it probes that
account only and never switches models).

The peak card reports **both calendars side by side** — the official API and OpenCode — with the current period and how
long (in hours, one decimal) until it flips. Capability chips on the model cards carry a tooltip explaining what the tag
means, the header links to the OpenCode Console subscription page, and a floating arrow returns to the top once you have
scrolled down. Every price cell shows the cached-input, uncached-input and output line, so a cached hit (the green row)
can be compared directly with what the official API would charge for the same tokens.

Prices are **not hardcoded**: the plugin reads OpenCode's public pricing table (`pricingUrl`, daily, cached in
`$DSH_HOME/opencode-routing-pricing.json`) and takes the plan price, every per-model rate and every monthly allowance
from it. `POST /opencode-usage.json` with `{"action":"syncPricing"}` forces a refresh; `pricingSync: false` keeps the
built-in table instead. The dialog follows the harness appearance setting (light / dark / follow system) by sampling the
painted page background, so it never lands dark-on-dark.

"编辑密钥" fetches the account's current key from `GET /opencode-quota-router.json?key=<account id>` and pre-fills the
input (a local-only endpoint; the list snapshot only ever carries a mask). Model names follow vendor casing
(`deepseek-v4.1-flash` → `DeepSeek V4.1 Flash`); vendors with a published brand mark render as an inline SVG, the rest
keep a letter badge. "下次探测" is a real timer (30 minutes by default) and the page re-renders every second, so it
counts down; opening the page only reads the snapshot and never triggers a probe.

"此刻用哪个更划算" is derived from the subscription leverage: Go charges $10 for $100 of list-priced allowance
(≈ ¥710), so OpenCode always costs 10 % of the official price — 90 % cheaper. Real data never favours the official
API.

The capability column comes from the same catalog endpoint (`/inference/go/v1/models`): `modalities.input` and
`capabilities` are rendered as text / image / video / audio / PDF, tool calls, reasoning, plus context length.
Zero-priced models show "无限" (unlimited).

### Peak / off-peak and holidays

DeepSeek's off-peak window is everything outside Beijing time Mon–Fri 09:00–12:00 and 14:00–18:00 (lunch break,
nights, weekends and **statutory holidays** included) at exactly half the peak price. OpenCode only treats UTC Mon–Fri
01–04 and 06–10 as peak and **ignores Chinese statutory holidays** (anomalyco/opencode#53071, maintainer:
*"Go pricing follows our own schedule, not DeepSeek's holiday calendar."*).

The plugin ships the 2026–2031 Chinese statutory holiday table. It is only applied to the official side when
`holidayAware: true` is set (`usage.holidayAware`); it defaults to off because OpenCode keeps charging peak on those
days. The table lives in `usage.js` as `HOLIDAYS`, and `isChinaHoliday()` can be called on its own.

The subscription price and its allowance can be overridden with `usage.planPriceUsd` / `usage.planAllowanceUsd`; the
discount on the page is derived from those two numbers, so a plan change from OpenCode is a config edit, not a patch.

## Settings API

`GET /opencode-quota-router.json` returns `{version, mode, reason, cause, active, activeLabel, updatedAt, checkedAt,
nextProbeAt, probeIntervalMs, usage, accounts[], quarantine[], routes[], lastFailure, upstream}`; account keys are
always masked (`hint`). `upstream` is the status card's payload: `{state, code, mode, cause, since, checkedAt,
windowMs, lastFailure, recovery, models[], recent[]}` where `state` is one of `healthy` / `degraded` / `fallback` /
`recovering` / `unknown`, `code` is one of `rate_limit`, `capacity`, `quota`, `payment`, `auth`, `missing_key`,
`sign_in`, `upgrade`, `not_found`, `bad_request`, `context`, `timeout`, `server`, `network`, `filter`, `error`, `ok`,
and `recovery` is `{active, stableSince, stableForMs, requiredMs, remainingMs, attempts, lastProbeAt,
probeIntervalMs}`. `official` is the published-status card's payload: `{ok, error, errorAt, url, fetchedAt, ageMs,
stale, status, since, updatedAt, services[], active[], models[]}` — `status` is the overall verdict
(`operational` / `degraded` / `outage` / `maintenance` / `unknown`), `services[]` is `{id, status, reason, since}`
for `inference` / `go` / `payg` / `free` (Console and logs are left out), `models[]` is `{model, status, reason,
service, ttftMs, tps}` for each route's primary model, and `active[]` lists the still-open incidents as `{id,
service, status, reason, startedAt, models[]}`. When the feed cannot be read, `ok` is `false` and `error` says why;
the card shows that and routing is untouched. `POST` to the same path with `{action, ...}`:

| action | arguments | effect |
| --- | --- | --- |
| `add` | `label?`, `key` | create an account (key ≥ 8 chars), store it and probe |
| `update` | `id`, `label?` / `enabled?` / `key?` | rename, disable/enable, rotate the key |
| `remove` | `id` | delete an account and its key (one is always kept) |
| `activate` | `id` | switch to it now |
| `move` | `id`, `direction: up\|down` | reorder |
| `probe` | `id?` | probe every account (and refresh the status), or just one |
| `status` | — | re-probe the upstream and refresh the status card (the 刷新 button) |
| `reset` | — | clear the exhausted/auth marks and return to the pool |
| `fallback` | — | switch routing to the official subscription now |
| `primary` | — | switch routing back to the OpenCode pool now |

`GET /opencode-usage.json` returns `{plan, configuredPlan, detectedPlan, holidayAware, peak, usage, accounts[],
activeAccount, models[], totals}`; `?refresh=1` forces a fresh official snapshot first.

## Languages

UI strings live in `DICT` in `client.js`: `zh` (source), `zh-tw`, `en`, plus `es` / `fr` / `de` / `pt` / `ja` / `ko` /
`ru` (inlined from translation files by `scripts/merge-i18n.mjs`; a missing key falls back to `en`, then to the key
itself). `localeOf()` matches the browser language prefix and separates Simplified from Traditional Chinese.

## Tests

```bash
node test.mjs
```

No model quota is required: fake context, fake credential store, fake webServer, and a local usage endpoint that
answers per API key. Coverage: composite mounting, account adoption, single-model quarantine, A→B failover with key
mirroring, per-account probing, whole-pool fallback, reset, settings-action validation, the usage view (capability
tags, unlimited models, peak/off-peak maths, billing lines), the single-account degradation, the status card
(classification of a 429 as a rate limit, the kept raw message, the failure counter), the published-status half
(services, per-model rows, a broken feed costing freshness but not routing) and the recovery window (one
clean probe is not enough, a failed probe restarts it, a degraded feed does not even start it, a full window switches
back and the next request goes to the pool again), plus a limit that lands after the first token (not retried in
place, but the step retry continues on the fallback route).

## Relation to the old packages

`dsh-opencode-quota-router` and `dsh-opencode-usage-settings` are its predecessors; everything they did is merged
here. Both are marked deprecated on npm and point at this package. Their GitHub repositories are retired; this one is
the single source.

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Run `node test.mjs` before opening a PR.

## License

MIT — see [LICENSE](LICENSE).
