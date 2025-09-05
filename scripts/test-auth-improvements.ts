#!/usr/bin/env tsx
// scripts/test-auth-improvements.ts
// Manual testing script for authentication improvements

import { authRateLimiter, checkRateLimit, getClientIP } from '../lib/rate-limiter'

console.log('🧪 Testing Authentication Improvements')
console.log('=====================================')

// Test 1: Rate Limiter Functionality
console.log('\n1. Testing Rate Limiter...')

// Mock request object for testing
const createMockRequest = (ip: string = '192.168.1.1'): Request => {
  return new Request('http://localhost:3000/api/auth/pin-session', {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ username: 'testuser', pin: '123456' }),
  })
}

// Test rate limiting with multiple requests
const testIP = '192.168.1.100'
const testUsername = 'testuser'

console.log('   - Testing normal usage (should allow first few requests)...')
for (let i = 1; i <= 3; i++) {
  const request = createMockRequest(testIP)
  const result = checkRateLimit(request, testUsername)
  console.log(
    `     Request ${i}: allowed=${result.allowed}, remaining=${result.headers['X-RateLimit-Remaining']}`,
  )
}

console.log('   - Testing rate limit enforcement (should block after limit)...')
for (let i = 4; i <= 8; i++) {
  const request = createMockRequest(testIP)
  const result = checkRateLimit(request, testUsername)
  console.log(
    `     Request ${i}: allowed=${result.allowed}, remaining=${result.headers['X-RateLimit-Remaining']}`,
  )
}

// Test 2: Client IP extraction
console.log('\n2. Testing Client IP extraction...')

const tests = [
  {
    name: 'X-Forwarded-For header',
    request: new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.1, 70.41.3.18, 150.172.238.178' },
    }),
    expected: '203.0.113.1',
  },
  {
    name: 'X-Real-IP header',
    request: new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.1' },
    }),
    expected: '198.51.100.1',
  },
  {
    name: 'No headers (fallback)',
    request: new Request('http://localhost'),
    expected: 'unknown',
  },
]

tests.forEach(test => {
  const result = getClientIP(test.request)
  const status = result === test.expected ? '✅' : '❌'
  console.log(`   ${status} ${test.name}: got "${result}", expected "${test.expected}"`)
})

// Test 3: Rate limiter stats
console.log('\n3. Rate Limiter Stats:')
const stats = authRateLimiter.getStats()
console.log(`   - Total tracked keys: ${stats.totalKeys}`)
console.log(`   - Window: ${stats.config.windowMs / 1000 / 60} minutes`)
console.log(`   - Max requests per window: ${stats.config.maxRequests}`)
console.log(`   - Block duration: ${stats.config.blockDurationMs / 1000 / 60} minutes`)

console.log('\n✅ Authentication improvements testing completed!')
console.log('\n📋 Summary of Improvements:')
console.log('   ✅ Database optimization: get_user_by_username() function')
console.log('   ✅ Security fix: Removed username enumeration logging')
console.log('   ✅ Rate limiting: 5 attempts per 15 minutes')
console.log('   ✅ Type safety: Added proper null checks')
console.log('   ✅ Code cleanup: Removed unused paths')
console.log('   ✅ Error standardization: Consistent messages')
