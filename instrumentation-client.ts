import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  person_profiles: 'identified_only',
  capture_pageview: 'history_change', // Automatically capture pageview and pageleave
  defaults: '2025-11-30', // Use latest defaults (includes external_scripts_inject_target: 'head')
  opt_out_capturing_by_default: true, // Start opted-out until consent is given
  autocapture: true,
  loaded: () => {
    // Check consent after PostHog loads
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('cookie-consent')
      if (consent === 'accepted') {
        posthog.opt_in_capturing()
      }
    }
  },
})
