import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // Security headers for PWA protection
  // Based on Next.js PWA documentation: https://nextjs.org/docs/app/guides/progressive-web-apps
  async headers() {
    return [
      {
        // Global security headers applied to all routes
        source: '/(.*)',
        headers: [
          {
            // Prevents MIME type sniffing attacks
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Protects against clickjacking attacks
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Controls referrer information leakage
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Global Content Security Policy for main application
            // Allows PostHog EU endpoint and other necessary domains
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.posthog.com https://*.posthog.com https://eu.i.posthog.com; connect-src 'self' http://127.0.0.1:54321 http://localhost:54321 https://jrgmetdsohowtxickqij.supabase.co https://world.openfoodfacts.org https://*.ondigitalocean.app https://fonts.googleapis.com https://fonts.gstatic.com https://app.posthog.com https://*.posthog.com https://eu.i.posthog.com; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:;",
          },
        ],
      },
      {
        // Service worker specific headers for PWA reliability
        source: '/sw.js',
        headers: [
          {
            // Ensures service worker is interpreted correctly as JavaScript
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            // Prevents caching of service worker to ensure users get latest version
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            // Implements strict Content Security Policy for service worker
            // Allows connections to Supabase, OpenFoodFacts, DigitalOcean API, Google Fonts, and PostHog
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' https://app.posthog.com https://*.posthog.com https://eu.i.posthog.com; connect-src 'self' http://127.0.0.1:54321 http://localhost:54321 https://jrgmetdsohowtxickqij.supabase.co https://world.openfoodfacts.org https://*.ondigitalocean.app https://fonts.googleapis.com https://fonts.gstatic.com https://app.posthog.com https://*.posthog.com https://eu.i.posthog.com; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          },
        ],
      },
      {
        // Manifest specific headers
        source: '/manifest.json',
        headers: [
          {
            // Ensures manifest is served with correct content type
            key: 'Content-Type',
            value: 'application/manifest+json; charset=utf-8',
          },
          {
            // Cache manifest for a short time but allow revalidation
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
        ],
      },
      {
        // PWA icons headers - specific icons
        source: '/icon-192.png',
        headers: [
          {
            // Cache icons for longer since they don't change often
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icon-512.png',
        headers: [
          {
            // Cache icons for longer since they don't change often
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // WASM files headers for Safari/iOS compatibility
        source: '/:path*.wasm',
        headers: [
          {
            // Ensure WASM files are served with correct MIME type
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            // Allow WASM execution in CSP
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'wasm-unsafe-eval'",
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/dashboard/inventory',
        destination: '/dashboard/inventory/products',
        permanent: false,
      },
    ]
  },
  webpack: config => {
    config.cache = {
      ...config.cache,
      compression: 'gzip',
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }

    // Suppress specific warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Serializing big strings/,
    ]

    // Configure WASM support for Safari/iOS compatibility
    // Required for barcode-detector package
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    }

    // Ensure WASM files are treated as assets and copied to output
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    })

    return config
  },
}

export default withNextIntl(nextConfig)
