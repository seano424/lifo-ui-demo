'use client'

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import React from 'react'

export default function DashboardBreadcrumbs() {
  const t = useTranslations('breadcrumbs')
  const pathname = usePathname()
  const pathSegments = pathname.split('/').filter(Boolean)
  const dashboardIndex = pathSegments.indexOf('dashboard')
  const subSegments = dashboardIndex >= 0 ? pathSegments.slice(dashboardIndex + 1) : []
  const isDashboardPage = subSegments.length === 0

  // Helper function to get translated segment name
  const getSegmentName = (segment: string): string => {
    try {
      return t(segment)
    } catch {
      // Fallback to capitalized segment if no translation exists
      return segment.charAt(0).toUpperCase() + segment.slice(1)
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {isDashboardPage ? (
            <BreadcrumbPage>{t('dashboard')}</BreadcrumbPage>
          ) : (
            <BreadcrumbLink href="/dashboard">{t('dashboard')}</BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {subSegments.map((segment, index) => {
          const href = `/dashboard/${subSegments.slice(0, index + 1).join('/')}`
          const isLast = index === subSegments.length - 1
          return (
            <React.Fragment key={segment}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{getSegmentName(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{getSegmentName(segment)}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
