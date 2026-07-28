import { setupGlobalMetrics } from './globalMetrics'

describe('setupGlobalMetrics', () => {
  const original = global.metrics

  afterEach(() => {
    global.metrics = original
  })

  it('installs the @vtex/api global metrics accumulator when absent', () => {
    delete (global as any).metrics

    setupGlobalMetrics()

    // These are the members @vtex/api's HttpClient middlewares reach for:
    // `addOnFlushMetric` in singleFlightMiddleware, `batch` in metricsMiddleware.
    expect(typeof global.metrics.addOnFlushMetric).toBe('function')
    expect(typeof global.metrics.batch).toBe('function')
  })

  it('does not replace an accumulator that is already installed', () => {
    const existing = ({ addOnFlushMetric: jest.fn(), batch: jest.fn() } as unknown) as typeof global.metrics
    global.metrics = existing

    setupGlobalMetrics()

    expect(global.metrics).toBe(existing)
  })

  it('is installed as a side effect of loading IOClientFactory', () => {
    delete (global as any).metrics
    jest.resetModules()

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../clients/IOClients/IOClientFactory')

    expect(typeof global.metrics.addOnFlushMetric).toBe('function')
  })
})
