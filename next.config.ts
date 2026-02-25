import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
    ],
  },

  // Security headers
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
            // Allows PostHog EU endpoint, barcode scanner WASM, FastAPI backend, ngrok tunnels, and other necessary domains
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.posthog.com https://*.posthog.com https://eu.i.posthog.com; worker-src blob:; connect-src 'self' http://127.0.0.1:54321 http://localhost:54321 http://127.0.0.1:8000 http://localhost:8000 https://*.ngrok-free.dev https://*.ngrok.io https://jrgmetdsohowtxickqij.supabase.co https://world.openfoodfacts.org https://*.ondigitalocean.app https://fonts.googleapis.com https://fonts.gstatic.com https://app.posthog.com https://*.posthog.com https://eu.i.posthog.com https://*.jsdelivr.net; font-src 'self' https://fonts.gstatic.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:;",
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
