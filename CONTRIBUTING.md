# Contributing

Thanks for taking a look. This plugin is a single package that mounts two halves (a usage dashboard and a quota
router) into one DeepSeek Harness Settings page.

## Ground rules

- Node 22+ (the tests use `zlib.zstdDecompressSync` and the built-in `fetch`).
- No runtime dependencies. The plugin must stay installable with `npm i` and nothing else.
- Keep both halves independent: `usage.js` must not import from `router.js` and vice versa; only `index.js` composes
  them.
- The dashboard is read-only towards the account pool. Only `router.js` writes the pool state file.

## Local workflow

```bash
node test.mjs          # unit + integration, no network, no model quota
node --check client.js # the browser bundle is a plain ES module factory
```

`test.mjs` starts a local HTTP server that answers the usage endpoint per API key, so a full failover can be
exercised offline.

If you change the UI, also load the settings page in a running Harness (`dsh` desktop app) and check that the section
still renders; the client bundle is only reloaded on app start.

## Translations

UI strings live in `client.js` as `DICT`. The extra locales are generated from `i18n/ui-<lang>.json` by:

```bash
node scripts/merge-i18n.mjs
```

Add a language by dropping `i18n/ui-<lang>.json` (same keys as `zh`) and re-running the script.

## Pull requests

- One topic per PR, with a short description of the behaviour change.
- Add or update assertions in `test.mjs` for anything behavioural.
- Update `README.md` (and, if you can, the other `README.<lang>.md` files) when the user-visible behaviour changes.

## Reporting bugs

Include the plugin version, the Harness version, your OS, and — if it is a routing problem — the JSON from
`GET /opencode-quota-router.json` with keys masked (they already are).
