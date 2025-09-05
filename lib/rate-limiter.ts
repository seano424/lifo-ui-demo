// lib/rate-limiter.ts
// Simple in-memory rate limiter for authentication endpoints
// Protects against brute force attacks

interface RateLimitData {
  requests: number
  windowStart: number
  lastRequest: number
}

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  blockDurationMs: number // How long to block after limit exceeded
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitData>()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    const expireTime = now - this.config.windowMs * 2 // Keep data for 2 windows

    for (const [key, data] of this.store.entries()) {
      if (data.lastRequest < expireTime) {
        this.store.delete(key)
      }
    }
  }

  private getClientKey(ip: string, identifier?: string): string {
    // Use IP + identifier (like username) for more granular limiting
    return identifier ? `${ip}:${identifier}` : ip
  }

  public isRateLimited(
    ip: string,
    identifier?: string,
  ): {
    limited: boolean
    remaining: number
    resetTime: number
  } {
    const key = this.getClientKey(ip, identifier)
    const now = Date.now()

    let data = this.store.get(key)

    // Initialize or reset window if expired
    if (!data || now - data.windowStart > this.config.windowMs) {
      data = {
        requests: 0,
        windowStart: now,
        lastRequest: now,
      }
    }

    // Check if we're still in the block period
    if (data.requests >= this.config.maxRequests) {
      const blockEndTime = data.lastRequest + this.config.blockDurationMs
      if (now < blockEndTime) {
        return {
          limited: true,
          remaining: 0,
          resetTime: blockEndTime,
        }
      } else {
        // Block period expired, reset
        data = {
          requests: 0,
          windowStart: now,
          lastRequest: now,
        }
      }
    }

    // Increment request count
    data.requests++
    data.lastRequest = now
    this.store.set(key, data)

    const remaining = Math.max(0, this.config.maxRequests - data.requests)
    const resetTime = data.windowStart + this.config.windowMs

    return {
      limited: data.requests > this.config.maxRequests,
      remaining,
      resetTime,
    }
  }

  public getStats() {
    return {
      totalKeys: this.store.size,
      config: this.config,
    }
  }

  public getConfig() {
    return this.config
  }
}

// Create rate limiters for different endpoints
export const authRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes after limit
})

// Helper function to get client IP from request
export function getClientIP(request: Request): string {
  // Try to get real IP from headers (for reverse proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  // Fallback - won't work in production behind proxy
  return 'unknown'
}

// Rate limiting middleware function
export function checkRateLimit(
  request: Request,
  identifier?: string,
): { allowed: boolean; headers: Record<string, string> } {
  const ip = getClientIP(request)
  const result = authRateLimiter.isRateLimited(ip, identifier)
  const config = authRateLimiter.getConfig()

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  }

  if (result.limited) {
    headers['Retry-After'] = Math.ceil((result.resetTime - Date.now()) / 1000).toString()
  }

  return {
    allowed: !result.limited,
    headers,
  }
}
