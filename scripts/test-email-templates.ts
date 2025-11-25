#!/usr/bin/env tsx
/**
 * Test script for email templates
 * Usage: npx tsx scripts/test-email-templates.ts
 */

import { sendWelcomeEmail, sendPasswordResetEmail } from '../lib/email/resend'

const testEmails = async () => {
  console.log('🧪 Testing Email Templates\n')

  // Prompt for email address
  const testEmail = process.env.TEST_EMAIL || 'your-email@example.com'

  if (testEmail === 'your-email@example.com') {
    console.log('❌ Error: Please set TEST_EMAIL environment variable')
    console.log('Example: TEST_EMAIL=your@email.com npx tsx scripts/test-email-templates.ts\n')
    process.exit(1)
  }

  const languages = ['en', 'fr', 'nl'] as const

  console.log(`📧 Test email will be sent to: ${testEmail}\n`)

  // Test Welcome Emails
  console.log('Testing Welcome Emails...')
  for (const language of languages) {
    console.log(`  Testing ${language.toUpperCase()} welcome email...`)

    const result = await sendWelcomeEmail({
      username: 'test_user',
      password: '123456',
      email: testEmail,
      full_name: 'Test User',
      store_name: 'Test Store',
      language,
    })

    if (result.success) {
      console.log(`    ✅ ${language.toUpperCase()} welcome email sent (ID: ${result.messageId})`)
    } else {
      console.log(`    ❌ ${language.toUpperCase()} welcome email failed: ${result.error}`)
    }
  }

  console.log('')

  // Test Password Reset Emails
  console.log('Testing Password Reset Emails...')
  for (const language of languages) {
    console.log(`  Testing ${language.toUpperCase()} password reset email...`)

    const result = await sendPasswordResetEmail({
      username: 'test_user',
      password: '789012',
      email: testEmail,
      full_name: 'Test User',
      store_name: 'Test Store',
      language,
    })

    if (result.success) {
      console.log(
        `    ✅ ${language.toUpperCase()} password reset email sent (ID: ${result.messageId})`,
      )
    } else {
      console.log(`    ❌ ${language.toUpperCase()} password reset email failed: ${result.error}`)
    }
  }

  console.log('\n✨ Email template testing complete!')
  console.log(`📬 Check your inbox at ${testEmail}\n`)
}

testEmails().catch(error => {
  console.error('💥 Error testing emails:', error)
  process.exit(1)
})
