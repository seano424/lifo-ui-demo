// scripts/test-webhook.ts
import crypto from 'node:crypto'

const payload = JSON.stringify({
  type: 'INSERT',
  table: 'stores',
  schema: 'business',
  record: {
    store_id: '6709a60e-0b49-4149-9401-1de7cc38456f',
    store_name: 'Test Store',
    timezone: 'Europe/Paris',
  },
  old_record: null,
})

// Use environment variable or allow override via command line argument
const secret = process.argv[2] || process.env.SUPABASE_WEBHOOK_SECRET || 'your-secret-here'

const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

console.log('🔐 Webhook Test Command Generator')
console.log('='.repeat(50))
console.log(`Signature: ${signature}`)
console.log('\n📋 Copy and run this command:')
console.log('='.repeat(50))
console.log(`curl -X POST http://localhost:3000/api/webhooks/store-created-scoring \\
  -H "Content-Type: application/json" \\
  -H "x-supabase-signature: ${signature}" \\
  -d '${payload}'`)
console.log('='.repeat(50))
console.log('\n💡 Tips:')
console.log('  - Make sure your dev server is running (npm run dev)')
console.log('  - To use a custom secret: npx tsx scripts/test-webhook.ts YOUR_SECRET')
console.log(`  - Current secret: ${secret.slice(0, 10)}...`)
