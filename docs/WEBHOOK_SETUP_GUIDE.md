# Email Delivery Webhooks Setup Guide

This guide walks you through configuring webhooks for the store onboarding email system using Supabase Database Webhooks and Resend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. New Store Created                                                │
│    INSERT INTO business.stores                                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. Supabase Database Webhook                                        │
│    Triggers on INSERT to business.stores                            │
│    → POST /api/webhooks/store-onboarding                           │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. Next.js API Route Handler                                        │
│    • Creates email_delivery record                                  │
│    • Sends email via Resend                                         │
│    • Updates delivery status                                        │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. Resend Sends Email                                               │
│    Returns: { id: "resend-email-id" }                              │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. Resend Webhook (Optional but Recommended)                        │
│    Tracks delivery events:                                          │
│    • email.delivered                                                │
│    • email.opened                                                   │
│    • email.clicked                                                  │
│    • email.bounced                                                  │
│    → POST /api/webhooks/resend                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Part 1: Configure Supabase Database Webhook

### Step 1: Access Supabase Dashboard

1. Go to your Supabase project: https://supabase.com/dashboard/project/jrgmetdsohowtxickqij
2. Navigate to **Database** → **Webhooks** (in the left sidebar)

### Step 2: Create New Webhook

Click **"Create a new webhook"** or **"Enable Webhooks"** button.

### Step 3: Configure Webhook Settings

Fill in the following details:

#### Basic Configuration

- **Name**: `store-onboarding-email`
- **Description**: `Triggers welcome email when a store is created`

#### Table Selection

- **Schema**: `business`
- **Table**: `stores`
- **Events**: Check **only** `INSERT`
  - ❌ UPDATE
  - ❌ DELETE
  - ✅ INSERT

#### HTTP Request Configuration

- **Method**: `POST`
- **URL**: `https://your-domain.com/api/webhooks/store-onboarding`

  Replace with your actual domain:
  - **Production**: `https://lifo.ai/api/webhooks/store-onboarding`
  - **Staging**: `https://staging.lifo.ai/api/webhooks/store-onboarding`
  - **Development (ngrok)**: `https://abc123.ngrok.io/api/webhooks/store-onboarding`

#### HTTP Headers

Add the following headers:

```
Content-Type: application/json
Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY
x-webhook-secret: YOUR_WEBHOOK_SECRET
```

**Important Security Notes:**
- Use your **service role key** (not anon key) from `.env.local`
- Generate a strong webhook secret: `openssl rand -hex 32`
- Store the secret in your environment variables

#### Webhook Security (Optional but Recommended)

Enable **"Sign webhook requests"** and note down the signing secret. You'll need this to verify webhook authenticity in your Next.js handler.

### Step 4: Test the Webhook

1. Click **"Test webhook"** button
2. Supabase will send a test payload
3. Check the response status (should be 200 OK)
4. Review logs to ensure your endpoint received the webhook

### Step 5: Enable the Webhook

Click **"Create webhook"** to activate it.

## Part 2: Create Next.js Webhook Handler

You'll need to create: `/app/api/webhooks/store-onboarding/route.ts`

### Expected Supabase Webhook Payload

```json
{
  "type": "INSERT",
  "table": "stores",
  "schema": "business",
  "record": {
    "store_id": "uuid-here",
    "store_name": "My Store",
    "owner_id": "owner-uuid",
    "email": "owner@example.com",
    "business_name": "Owner Name",
    "created_at": "2025-10-29T12:00:00Z"
  },
  "old_record": null
}
```

### Handler Implementation Checklist

Your Next.js handler should:

1. ✅ **Verify webhook signature** (if enabled)
2. ✅ **Validate payload structure** (use Zod schema)
3. ✅ **Create email delivery record** using `user_mgmt.create_email_delivery()`
4. ✅ **Get store/owner details** from database
5. ✅ **Send email via Resend**
6. ✅ **Update delivery status** with Resend email ID
7. ✅ **Handle errors gracefully** with proper logging
8. ✅ **Implement idempotency** (prevent duplicate sends)

### Reference Pattern

Look at existing webhook handler for guidance:
- File: `/app/api/webhooks/store-created-scoring/route.ts`
- Similar pattern: signature verification, payload validation, idempotency

### Database Functions to Use

```typescript
// 1. Create email delivery record
const { data: deliveryId } = await supabase.rpc('create_email_delivery', {
  p_store_id: storeId,
  p_user_id: ownerId,
  p_recipient_email: email,
  p_email_type: 'onboarding_welcome',
  p_subject: `Welcome to LIFO, ${storeName}!`,
  p_template_id: null, // or your Resend template ID
  p_email_data: {
    store_name: storeName,
    owner_name: businessName,
    login_url: 'https://lifo.ai/login'
  },
  p_metadata: {
    campaign_id: 'onboarding-2025',
    source: 'store_creation'
  }
})

// 2. Update delivery status after sending
await supabase.rpc('update_email_delivery_status', {
  p_email_delivery_id: deliveryId,
  p_status: 'sent',
  p_resend_email_id: resendResponse.id
})
```

## Part 3: Configure Resend Webhooks

Resend webhooks track email delivery status and user engagement.

### Step 1: Access Resend Dashboard

1. Go to https://resend.com/webhooks
2. Click **"Create Webhook"** or **"Add Webhook"**

### Step 2: Configure Webhook Endpoint

- **Webhook URL**: `https://your-domain.com/api/webhooks/resend`
  - Replace with your actual domain
  - Use ngrok for local testing: `https://abc123.ngrok.io/api/webhooks/resend`

### Step 3: Select Events to Track

Check the following events:

✅ **email.sent** - Email successfully sent to Resend
✅ **email.delivered** - Email delivered to recipient's inbox
✅ **email.delivery_delayed** - Email delayed (temporary issue)
✅ **email.bounced** - Email bounced (hard/soft)
✅ **email.complained** - Recipient marked as spam
✅ **email.opened** - Recipient opened the email
✅ **email.clicked** - Recipient clicked a link

❌ Don't check events you don't need (reduces noise)

### Step 4: Copy Webhook Secret

Resend will provide a **webhook signing secret** (starts with `whsec_`).

**Important**: Save this secret to your environment variables:

```bash
# .env.local
RESEND_WEBHOOK_SECRET=whsec_your_secret_here
```

### Step 5: Test the Webhook

1. Resend will show a **"Send test event"** button
2. Click it to send a test payload to your endpoint
3. Verify your endpoint returns 200 OK
4. Check your logs to ensure proper handling

### Step 6: Activate Webhook

Click **"Create"** or **"Activate"** to enable the webhook.

## Part 4: Create Resend Webhook Handler

You'll need to create: `/app/api/webhooks/resend/route.ts`

### Expected Resend Webhook Payload

```json
{
  "type": "email.delivered",
  "created_at": "2025-10-29T12:00:00.000Z",
  "data": {
    "email_id": "resend-email-id-here",
    "from": "noreply@lifo.ai",
    "to": ["user@example.com"],
    "subject": "Welcome to LIFO!",
    "created_at": "2025-10-29T12:00:00.000Z"
  }
}
```

### Event Type Mapping

Map Resend events to your database statuses:

```typescript
const STATUS_MAP = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'pending', // Keep as pending, will retry
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
}
```

### Handler Implementation Checklist

Your Resend webhook handler should:

1. ✅ **Verify webhook signature** using Resend signing secret
2. ✅ **Parse and validate payload**
3. ✅ **Find email delivery by resend_email_id**
4. ✅ **Update delivery status** using `update_email_delivery_status()`
5. ✅ **Handle unknown email IDs gracefully**
6. ✅ **Return 200 OK quickly** (don't block webhook)

### Status Update Pattern

```typescript
// Find the email delivery record
const { data: delivery } = await supabase
  .from('email_deliveries')
  .select('email_delivery_id')
  .eq('resend_email_id', data.email_id)
  .single()

if (delivery) {
  // Update status
  await supabase.rpc('update_email_delivery_status', {
    p_email_delivery_id: delivery.email_delivery_id,
    p_status: STATUS_MAP[type],
    p_webhook_event_id: `${type}_${data.email_id}_${Date.now()}`
  })
}
```

## Environment Variables Checklist

Add these to your `.env.local`:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://jrgmetdsohowtxickqij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Resend
RESEND_API_KEY=re_your_api_key_here
RESEND_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Webhook Security
SUPABASE_WEBHOOK_SECRET=your-generated-secret-here

# Domain (for webhook URLs)
NEXT_PUBLIC_APP_URL=https://lifo.ai
```

## Testing Locally with ngrok

### Step 1: Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Start Your Development Server

```bash
npm run dev  # Runs on http://localhost:3000
```

### Step 3: Create ngrok Tunnel

```bash
ngrok http 3000
```

This will output:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### Step 4: Update Webhook URLs

Use the ngrok URL in both Supabase and Resend webhooks:
- Supabase: `https://abc123.ngrok.io/api/webhooks/store-onboarding`
- Resend: `https://abc123.ngrok.io/api/webhooks/resend`

### Step 5: Test Store Creation

```bash
# Insert a test store to trigger the webhook
# (Run in Supabase SQL Editor or your app)
INSERT INTO business.stores (
  store_name,
  store_code,
  email,
  owner_id
) VALUES (
  'Test Store',
  'TEST001',
  'test@example.com',
  'owner-uuid-here'
);
```

### Step 6: Monitor Logs

Watch your terminal for webhook requests:
```bash
# Your Next.js server will log:
[webhook:store-onboarding] Received webhook
[webhook:store-onboarding] Email sent successfully
```

## Monitoring & Debugging

### Check Webhook Logs in Supabase

1. Go to **Database** → **Webhooks**
2. Click on your webhook
3. View **"Recent Deliveries"** tab
4. Check status codes and response times

### Query Email Deliveries

```sql
-- View recent email deliveries
SELECT
  email_delivery_id,
  email_type,
  recipient_email,
  status,
  created_at,
  sent_at,
  delivered_at,
  error_message
FROM user_mgmt.email_deliveries
ORDER BY created_at DESC
LIMIT 20;

-- Check for failed emails
SELECT * FROM user_mgmt.email_deliveries
WHERE status = 'failed'
ORDER BY created_at DESC;

-- View emails for a specific store
SELECT * FROM user_mgmt.email_deliveries
WHERE store_id = 'your-store-uuid'
ORDER BY created_at DESC;
```

### Check Webhook Logs

```sql
-- View recent webhook executions
SELECT
  webhook_type,
  store_id,
  status,
  created_at,
  processed_at,
  error_message
FROM public.webhook_logs
WHERE webhook_type IN ('store_scoring_setup', 'store_onboarding_email')
ORDER BY created_at DESC
LIMIT 20;
```

### Common Issues & Solutions

#### Issue: Webhook not triggering

**Solutions:**
- ✅ Verify webhook is enabled in Supabase dashboard
- ✅ Check webhook URL is correct and accessible
- ✅ Ensure your app is running (or ngrok tunnel is active)
- ✅ Check INSERT event is selected

#### Issue: Webhook returns 401/403

**Solutions:**
- ✅ Verify Authorization header has correct service role key
- ✅ Check webhook secret matches environment variable
- ✅ Ensure signature verification logic is correct

#### Issue: Email not sending

**Solutions:**
- ✅ Check Resend API key is valid
- ✅ Verify sender email is verified in Resend dashboard
- ✅ Check recipient email format is valid
- ✅ Review error logs in `email_deliveries` table

#### Issue: Duplicate emails sent

**Solutions:**
- ✅ Implement idempotency check (query existing deliveries)
- ✅ Use database constraints (unique on store_id + email_type)
- ✅ Check webhook logs for duplicate calls

## Production Checklist

Before going live:

- [ ] Migration applied to production database
- [ ] Environment variables configured in production
- [ ] Webhook URLs point to production domain (not ngrok)
- [ ] Webhook secrets are securely stored
- [ ] Signature verification enabled and tested
- [ ] Error handling tested (what happens if Resend is down?)
- [ ] Idempotency tested (prevent duplicate emails)
- [ ] Resend sender email verified for production domain
- [ ] Monitoring/alerting set up for failed deliveries
- [ ] Rate limiting configured (prevent abuse)

## Next Steps

After setup:

1. **Create email templates** in Resend dashboard
2. **Design onboarding email** with your branding
3. **Add retry logic** for failed deliveries
4. **Set up email analytics** to track open/click rates
5. **Create admin dashboard** to view email delivery status
6. **Add more email types** (password reset, notifications, etc.)

## Support & Resources

- **Supabase Webhooks Docs**: https://supabase.com/docs/guides/database/webhooks
- **Resend Docs**: https://resend.com/docs
- **Resend Webhooks**: https://resend.com/docs/webhooks
- **Migration File**: `/lifo-app/supabase/migrations/20251029000000_create_email_deliveries_table.sql`
- **Example Handler**: `/lifo-app/app/api/webhooks/store-created-scoring/route.ts`

---

**Need Help?**
- Check logs in Supabase Dashboard → Database → Webhooks
- Query `user_mgmt.email_deliveries` for delivery status
- Review Next.js console logs for errors
