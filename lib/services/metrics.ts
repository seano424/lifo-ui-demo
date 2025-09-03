/**
 * Metrics Service for API Performance Monitoring
 * Tracks response times, error rates, and circuit breaker states
 */

interface MetricEntry {
  timestamp: number
  duration: number
  status: 'success' | 'error' | 'timeout'
  statusCode?: number
  errorMessage?: string
}

interface EndpointMetrics {
  totalRequests: number
  successCount: number
  errorCount: number
  timeoutCount: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  lastUpdated: number
  recentEntries: MetricEntry[]
  errorRate: number
  circuitState: 'closed' | 'open' | 'half-open'
  consecutiveFailures: number
  lastFailureTime?: number
  nextRetryTime?: number
}

interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  halfOpenRequests: number
  timeoutThreshold: number
}

class MetricsService {
  private metrics: Map<string, EndpointMetrics> = new Map()
  private maxRecentEntries = 100
  private metricsFlushInterval = 60000 // 1 minute
  private circuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenRequests: 3,
    timeoutThreshold: 10000, // 10 seconds
  }
  private flushTimer?: NodeJS.Timeout

  constructor() {
    if (typeof window !== 'undefined') {
      this.startMetricsFlush()
      this.loadStoredMetrics()
    }
  }

  private startMetricsFlush() {
    this.flushTimer = setInterval(() => {
      this.flushMetrics()
    }, this.metricsFlushInterval)
  }

  private loadStoredMetrics() {
    try {
      const stored = localStorage.getItem('api-metrics')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.metrics = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.error('[Metrics] Failed to load stored metrics:', error)
    }
  }

  private flushMetrics() {
    try {
      const metricsObject = Object.fromEntries(this.metrics)
      localStorage.setItem('api-metrics', JSON.stringify(metricsObject))

      // Clean up old entries
      this.metrics.forEach((metrics, _endpoint) => {
        if (metrics.recentEntries.length > this.maxRecentEntries) {
          metrics.recentEntries = metrics.recentEntries.slice(-this.maxRecentEntries)
        }
      })
    } catch (error) {
      console.error('[Metrics] Failed to flush metrics:', error)
    }
  }

  private getOrCreateEndpointMetrics(endpoint: string): EndpointMetrics {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        timeoutCount: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        lastUpdated: Date.now(),
        recentEntries: [],
        errorRate: 0,
        circuitState: 'closed',
        consecutiveFailures: 0,
      })
    }
    return this.metrics.get(endpoint)!
  }

  recordRequest(
    endpoint: string,
    duration: number,
    status: 'success' | 'error' | 'timeout',
    statusCode?: number,
    errorMessage?: string,
  ) {
    const metrics = this.getOrCreateEndpointMetrics(endpoint)
    const entry: MetricEntry = {
      timestamp: Date.now(),
      duration,
      status,
      statusCode,
      errorMessage,
    }

    // Update basic counts
    metrics.totalRequests++
    metrics.lastUpdated = Date.now()

    if (status === 'success') {
      metrics.successCount++
      metrics.consecutiveFailures = 0
    } else if (status === 'error') {
      metrics.errorCount++
      metrics.consecutiveFailures++
    } else if (status === 'timeout') {
      metrics.timeoutCount++
      metrics.consecutiveFailures++
    }

    // Add to recent entries
    metrics.recentEntries.push(entry)
    if (metrics.recentEntries.length > this.maxRecentEntries) {
      metrics.recentEntries.shift()
    }

    // Calculate metrics
    this.calculateMetrics(metrics)

    // Update circuit breaker state
    this.updateCircuitBreaker(metrics)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metrics] ${endpoint}:`, {
        status,
        duration: `${duration}ms`,
        errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
        circuitState: metrics.circuitState,
        avgResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
      })
    }
  }

  private calculateMetrics(metrics: EndpointMetrics) {
    const recentSuccesses = metrics.recentEntries.filter(e => e.status === 'success')

    if (recentSuccesses.length > 0) {
      const durations = recentSuccesses.map(e => e.duration).sort((a, b) => a - b)

      // Calculate average
      const sum = durations.reduce((acc, d) => acc + d, 0)
      metrics.averageResponseTime = sum / durations.length

      // Calculate percentiles
      const p95Index = Math.floor(durations.length * 0.95)
      const p99Index = Math.floor(durations.length * 0.99)
      metrics.p95ResponseTime = durations[Math.min(p95Index, durations.length - 1)]
      metrics.p99ResponseTime = durations[Math.min(p99Index, durations.length - 1)]
    }

    // Calculate error rate from recent entries
    const recentWindowSize = Math.min(metrics.recentEntries.length, 20)
    if (recentWindowSize > 0) {
      const recentWindow = metrics.recentEntries.slice(-recentWindowSize)
      const recentErrors = recentWindow.filter(e => e.status !== 'success').length
      metrics.errorRate = recentErrors / recentWindowSize
    }
  }

  private updateCircuitBreaker(metrics: EndpointMetrics) {
    const now = Date.now()

    switch (metrics.circuitState) {
      case 'closed':
        if (metrics.consecutiveFailures >= this.circuitBreakerConfig.failureThreshold) {
          metrics.circuitState = 'open'
          metrics.lastFailureTime = now
          metrics.nextRetryTime = now + this.circuitBreakerConfig.resetTimeout
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              `[CircuitBreaker] Circuit opened after ${metrics.consecutiveFailures} consecutive failures`,
            )
          }
        }
        break

      case 'open':
        if (metrics.nextRetryTime && now >= metrics.nextRetryTime) {
          metrics.circuitState = 'half-open'
          if (process.env.NODE_ENV === 'development') {
            console.info(`[CircuitBreaker] Circuit entering half-open state`)
          }
        }
        break

      case 'half-open':
        if (metrics.consecutiveFailures === 0) {
          metrics.circuitState = 'closed'
          if (process.env.NODE_ENV === 'development') {
            console.info(`[CircuitBreaker] Circuit closed after successful request`)
          }
        } else if (metrics.consecutiveFailures >= this.circuitBreakerConfig.halfOpenRequests) {
          metrics.circuitState = 'open'
          metrics.lastFailureTime = now
          metrics.nextRetryTime = now + this.circuitBreakerConfig.resetTimeout
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              `[CircuitBreaker] Circuit re-opened after ${metrics.consecutiveFailures} failures in half-open state`,
            )
          }
        }
        break
    }
  }

  shouldAllowRequest(endpoint: string): boolean {
    const metrics = this.metrics.get(endpoint)
    if (!metrics) return true

    if (metrics.circuitState === 'open') {
      const now = Date.now()
      if (metrics.nextRetryTime && now >= metrics.nextRetryTime) {
        metrics.circuitState = 'half-open'
        return true
      }
      return false
    }

    return true
  }

  getEndpointMetrics(endpoint: string): EndpointMetrics | undefined {
    return this.metrics.get(endpoint)
  }

  getAllMetrics(): Map<string, EndpointMetrics> {
    return new Map(this.metrics)
  }

  resetEndpointMetrics(endpoint: string) {
    this.metrics.delete(endpoint)
  }

  resetAllMetrics() {
    this.metrics.clear()
    localStorage.removeItem('api-metrics')
  }

  getMetricsSummary() {
    const summary: Record<string, any> = {}

    this.metrics.forEach((metrics, endpoint) => {
      summary[endpoint] = {
        totalRequests: metrics.totalRequests,
        successRate: `${((metrics.successCount / metrics.totalRequests) * 100).toFixed(2)}%`,
        errorRate: `${(metrics.errorRate * 100).toFixed(2)}%`,
        avgResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`,
        p95ResponseTime: `${metrics.p95ResponseTime.toFixed(0)}ms`,
        p99ResponseTime: `${metrics.p99ResponseTime.toFixed(0)}ms`,
        circuitState: metrics.circuitState,
        lastUpdated: new Date(metrics.lastUpdated).toISOString(),
      }
    })

    return summary
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flushMetrics()
  }
}

// Singleton instance
let metricsInstance: MetricsService | null = null

export function getMetricsService(): MetricsService {
  if (!metricsInstance) {
    metricsInstance = new MetricsService()
  }
  return metricsInstance
}

// Hook for React components
export function useMetrics() {
  const metrics = getMetricsService()

  return {
    recordRequest: metrics.recordRequest.bind(metrics),
    shouldAllowRequest: metrics.shouldAllowRequest.bind(metrics),
    getEndpointMetrics: metrics.getEndpointMetrics.bind(metrics),
    getAllMetrics: metrics.getAllMetrics.bind(metrics),
    getMetricsSummary: metrics.getMetricsSummary.bind(metrics),
    resetEndpointMetrics: metrics.resetEndpointMetrics.bind(metrics),
    resetAllMetrics: metrics.resetAllMetrics.bind(metrics),
  }
}

// Wrapper for fetch with metrics
export async function fetchWithMetrics(
  endpoint: string,
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const metrics = getMetricsService()

  // Check circuit breaker
  if (!metrics.shouldAllowRequest(endpoint)) {
    throw new Error(`Circuit breaker open for endpoint: ${endpoint}`)
  }

  const startTime = Date.now()

  try {
    const response = await fetch(url, options)
    const duration = Date.now() - startTime

    if (response.ok) {
      metrics.recordRequest(endpoint, duration, 'success', response.status)
    } else {
      metrics.recordRequest(endpoint, duration, 'error', response.status)
    }

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    const isTimeout = duration >= 10000 // 10 second timeout

    metrics.recordRequest(
      endpoint,
      duration,
      isTimeout ? 'timeout' : 'error',
      undefined,
      error instanceof Error ? error.message : 'Unknown error',
    )

    throw error
  }
}
