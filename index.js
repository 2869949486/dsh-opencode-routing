/**
 * One package, one settings page: the account pool + quota router and the usage
 * dashboard are mounted as two child plugins, so each keeps its own required
 * dependencies (`llm` for routing, `webServer` for the JSON endpoints) while the
 * profile only inserts a single entry.
 */
import * as router from './router.js'
import * as usage from './usage.js'

export const name = 'opencode-router'
export const inject = []

/** Top-level keys apply to both children; `usage:` / `router:` objects override
 *  them per child (both plugins have a `path`, so the split is required). */
function partition(config) {
  const base = config ?? {}
  const usageConfig = { ...base, ...(base.usage ?? {}) }
  const routerConfig = { ...base, ...(base.router ?? {}) }
  delete usageConfig.usage
  delete usageConfig.router
  delete routerConfig.usage
  delete routerConfig.router
  return { usageConfig, routerConfig }
}

export function apply(ctx, config = {}) {
  const { usageConfig, routerConfig } = partition(config)
  ctx.plugin({ name: 'opencode-router:usage', inject: usage.inject, apply: usage.apply }, usageConfig)
  ctx.plugin({ name: 'opencode-router:router', inject: router.inject, apply: router.apply }, routerConfig)
}

export { beijingParts, isChinaHoliday, peakClock, peakMultiplier, peakSnapshot, PEAK_RULE } from './usage.js'
export { isExhausted, retryAfter, nextProbeAt, maskKey } from './router.js'
