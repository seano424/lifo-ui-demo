import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n.ts')

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/settings',
        destination: '/dashboard/settings/store',
        permanent: false,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
