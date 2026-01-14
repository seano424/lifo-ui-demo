/**
 * Square OAuth Callback Page
 * Handles OAuth redirect from Square and processes connection
 */

import { ErrorBoundary } from '@/components/ui/error-boundary'
import { SquareCallbackProcessor } from '@/components/integrations/square-callback-processor'

export default function SquareCallbackPage() {
  return (
    <ErrorBoundary>
      <div className="container py-8">
        <SquareCallbackProcessor />
      </div>
    </ErrorBoundary>
  )
}
