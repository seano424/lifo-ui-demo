/**
 * Set NEXT_PUBLIC_BILLING_LIVE=true in your environment when Stripe is ready.
 * When true: the soft billing banner disappears and the Pro plan CTA activates.
 */
export const BILLING_LIVE = process.env.NEXT_PUBLIC_BILLING_LIVE === 'true'
