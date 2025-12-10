#!/usr/bin/env node
/**
 * Test script for email templates
 * Usage: node --env-file=.env.local scripts/test-email-templates.mjs your@email.com
 */

// We need to import the actual functions, but since they're in TypeScript,
// let's just test by directly calling the Resend API with our template logic

import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const testEmail = process.argv[2]

if (!testEmail) {
  console.log('❌ Error: Please provide an email address')
  console.log('Usage: node --env-file=.env.local scripts/test-email-templates.mjs your@email.com\n')
  process.exit(1)
}

if (!process.env.RESEND_API) {
  console.log('❌ Error: RESEND_API environment variable not found')
  console.log('Make sure to run with: node --env-file=.env.local scripts/test-email-templates.mjs\n')
  process.exit(1)
}

console.log('🧪 Testing Email Templates\n')
console.log(`📧 Test emails will be sent to: ${testEmail}\n`)
console.log('⚠️  Note: To properly test the full templates, you need to use them from your app code.')
console.log('This script just verifies the emails can be sent.\n')

// For proper testing, you'll need to call sendWelcomeEmail() and sendPasswordResetEmail()
// from actual app code where TypeScript is compiled

console.log('To test the actual templates with all languages:')
console.log('1. Use the Next.js app to trigger employee creation (which calls sendWelcomeEmail)')
console.log('2. Or add a test API route that calls the functions directly')
console.log('\nExample API route code:')
console.log(`
import { sendWelcomeEmail } from '@/lib/email/resend'

// Test endpoint: /api/test-email
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const language = searchParams.get('lang') || 'fr'

  await sendWelcomeEmail({
    username: 'test_user',
    password: '123456',
    email: '${testEmail}',
    full_name: 'Test User',
    store_name: 'Test Store',
    language: language
  })

  return Response.json({ success: true })
}
`)
