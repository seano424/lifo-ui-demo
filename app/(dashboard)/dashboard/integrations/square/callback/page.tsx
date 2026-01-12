/**
 * Square OAuth Callback Page
 * Handles OAuth redirect from Square and processes connection
 */

import { SquareCallbackProcessor } from '@/components/integrations/square-callback-processor'

export default function SquareCallbackPage() {
  return (
    <div className="container py-8">
      <SquareCallbackProcessor />
    </div>
  )
}
