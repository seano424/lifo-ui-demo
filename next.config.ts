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
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'",
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

    return config
  },
}

export default withNextIntl(nextConfig)
