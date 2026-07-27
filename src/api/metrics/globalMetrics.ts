import { MetricsAccumulator } from '@vtex/api'

/**
 * `@vtex/api`'s HttpClient middlewares reference a *global* `metrics` accumulator.
 * `singleFlightMiddleware`, for instance, calls `metrics.addOnFlushMetric` for every
 * request that sets an `inflightKey` — which includes `Apps.listApps`, used by
 * `vtex list` / `vtex ls`.
 *
 * Up to `@vtex/api` 3.x that global was installed as a side effect of importing the
 * package: `lib/service/Runtime.js` assigned it at module load. Since v6/v7 it is only
 * assigned inside `startApp()`, which boots the IO service runtime and therefore never
 * runs in a CLI. Toolbelt must install it itself, otherwise those requests fail with
 * `ReferenceError: metrics is not defined`.
 *
 * Idempotent: never replaces an accumulator that is already in place.
 */
export const setupGlobalMetrics = () => {
  if (!global.metrics) {
    global.metrics = new MetricsAccumulator()
  }
}
