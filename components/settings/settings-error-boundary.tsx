import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface SettingsErrorProps {
  errorType: 'unauthorized' | 'forbidden' | 'not-found' | 'server-error'
  title?: string
  message?: string
  showBackButton?: boolean
  showRefreshButton?: boolean
  customAction?: {
    label: string
    href: string
  }
}

const defaultMessages = {
  unauthorized: {
    title: 'Authentication Required',
    message: 'Please log in to access this page.',
  },
  forbidden: {
    title: 'Permission Denied',
    message:
      "You don't have permission to access this section. Contact your store manager or owner.",
  },
  'not-found': {
    title: 'Store Not Found',
    message: "The store you're trying to access doesn't exist or you don't have access to it.",
  },
  'server-error': {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
  },
}

export function SettingsError({
  errorType,
  title,
  message,
  showBackButton = true,
  showRefreshButton = true,
  customAction,
}: SettingsErrorProps) {
  const defaultContent = defaultMessages[errorType]
  const displayTitle = title || defaultContent.title
  const displayMessage = message || defaultContent.message

  return (
    <div className="max-w-2xl mx-auto py-12">
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">{displayTitle}</AlertTitle>
        <AlertDescription className="text-base mt-2">{displayMessage}</AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-3 justify-center">
        {showBackButton && (
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        )}

        {showRefreshButton && (
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
        )}

        {customAction && (
          <Button asChild>
            <Link href={customAction.href}>{customAction.label}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

// Specific error components for common scenarios
export function StoreAccessDenied({
  storeName,
  userRole,
}: {
  storeName?: string
  userRole?: string
}) {
  const roleMessage =
    userRole === 'employee'
      ? 'As an employee, you have limited access to store settings.'
      : 'Contact your store owner for access to this section.'

  return (
    <SettingsError
      errorType="forbidden"
      title="Settings Access Restricted"
      message={`${storeName ? `For ${storeName}: ` : ''}${roleMessage}`}
      customAction={{
        label: 'View Your Profile',
        href: '/dashboard/settings?tab=account',
      }}
    />
  )
}

export function NoStoreAccess() {
  return (
    <SettingsError
      errorType="not-found"
      title="No Store Access"
      message="You don't have access to any stores yet. Contact your organization administrator to get added to a store."
      showRefreshButton={false}
      customAction={{
        label: 'Contact Support',
        href: '/support',
      }}
    />
  )
}

export function StoreNotFound({ storeId }: { storeId?: string }) {
  return (
    <SettingsError
      errorType="not-found"
      title="Store Not Found"
      message={`${storeId ? `Store "${storeId}" was` : 'The requested store was'} not found or you don't have access to it.`}
      customAction={{
        label: 'View Available Stores',
        href: '/dashboard',
      }}
    />
  )
}
