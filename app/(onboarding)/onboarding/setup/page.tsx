import { Suspense } from 'react'
import { SetupPageClient } from './setup-client'

export default function SetupPage() {
  return (
    <Suspense>
      <SetupPageClient />
    </Suspense>
  )
}
