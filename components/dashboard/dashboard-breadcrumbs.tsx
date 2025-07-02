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

export default function DashboardBreadcrumbs() {
  const pathname = usePathname()
  const pathSegments = pathname.split('/').filter(Boolean)
  const dashboardIndex = pathSegments.indexOf('dashboard')
  const subSegments = dashboardIndex >= 0 ? pathSegments.slice(dashboardIndex + 1) : []
  const isDashboardPage = subSegments.length === 0

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {isDashboardPage ? (
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          ) : (
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {subSegments.length > 0 && <BreadcrumbSeparator />}
        {subSegments.map((segment, index) => {
          const href = `/dashboard/${subSegments.slice(0, index + 1).join('/')}`
          const isLast = index === subSegments.length - 1
          return (
            <BreadcrumbItem key={segment}>
              {isLast ? (
                <BreadcrumbPage>
                  {segment.charAt(0).toUpperCase() + segment.slice(1)}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={href}>
                  {segment.charAt(0).toUpperCase() + segment.slice(1)}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
