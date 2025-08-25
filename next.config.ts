import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
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
