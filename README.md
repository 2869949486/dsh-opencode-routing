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

## Account pool and failover

Pool order is usage order. Exactly one account is "current" at any time, and its key is mirrored into the credential
reference the provider reads (default `OPENCODE_API_KEY`). Switching accounts therefore needs no provider config
change: `resolveApiKey` runs after the `agent/request` hook, on every streaming call.

- **A runs dry, B takes over**: on `QUOTA` / `ACCOUNT_QUOTA` / 429 once the official allowance is confirmed spent, or
  on an auth-class error (`AUTH`, `INVALID_CREDENTIAL`, `MISSING_CREDENTIAL`, `ACCOUNT_SIGN_IN_REQUIRED`,
  `CLIENT_UPGRADE_REQUIRED`), the current account is marked unusable (until the window resets, or for 30 minutes on
  auth failure), routing moves to the next enabled account and **retries the same step** — the turn is never downgraded.
- **Single-model quarantine**: when only one model is out of allowance and the pool still has budget, only that model
  is quarantined (30 minutes by default); every other model keeps using the plan.
- **Whole pool dry**: only then does the route fall back to its `fallback` (DeepSeek account by default), with a
  zero-token `GET /inference/go/v1/usage` probe every 30 minutes (or at the rolling window reset) that returns to the
  plan automatically.
- **Reset**: "重置封禁标记" in Settings clears every exhausted/auth mark and returns to the pool immediately. Accounts and
  keys are untouched.

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

"编辑密钥" fetches the account's current key from `GET /opencode-quota-router.json?key=<account id>` and pre-fills the
input (a local-only endpoint; the list snapshot only ever carries a mask). Model names follow vendor casing
(`deepseek-v4.1-flash` → `DeepSeek V4.1 Flash`); vendors with a published brand mark render as an inline SVG, the rest
keep a letter badge. "下次探测" is a real timer (30 minutes by default) and the page re-renders every second, so it
counts down; opening the page only reads the snapshot and never triggers a probe.

"此刻用哪个更划算" is derived from the subscription leverage: Go charges $10 for $100 of list-priced allowance
(≈ ¥710), so OpenCode always costs 10 % of the official price — 90 % cheaper. Real data never favours the official
API; the button in the card's corner switches to sample data so you can see what that case would look like.

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

`GET /opencode-quota-router.json` returns `{mode, reason, active, accounts[], quarantine[], routes[], lastFailure}`;
account keys are always masked (`hint`). `POST` to the same path with `{action, ...}`:

| action | arguments | effect |
| --- | --- | --- |
| `add` | `label?`, `key` | create an account (key ≥ 8 chars), store it and probe |
| `update` | `id`, `label?` / `enabled?` / `key?` | rename, disable/enable, rotate the key |
| `remove` | `id` | delete an account and its key (one is always kept) |
| `activate` | `id` | switch to it now |
| `move` | `id`, `direction: up\|down` | reorder |
| `probe` | `id?` | probe every account, or just one |
| `reset` | — | clear the exhausted/auth marks and return to the pool |

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
tags, unlimited models, peak/off-peak maths, billing lines) and the single-account degradation.

## Relation to the old packages

`dsh-opencode-quota-router` and `dsh-opencode-usage-settings` are its predecessors; everything they did is merged
here. Both are marked deprecated on npm and point at this package. Repositories:
[`2869949486/dsh-opencode-routing`](https://github.com/2869949486/dsh-opencode-routing) (current),
[`dsh-opencode-quota-router`](https://github.com/2869949486/dsh-opencode-quota-router),
[`dsh-opencode-usage`](https://github.com/2869949486/dsh-opencode-usage).

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Run `node test.mjs` before opening a PR.

## License

MIT — see [LICENSE](LICENSE).
