// app/(auth)/auth/sign-up/page.tsx

import { SignUpForm } from '@/components/sign-up-form'

export default function Page() {
  return (
    <div className="flex lg:min-h-svh w-full items-center justify-center p-6">
      <SignUpForm />
    </div>
  )
}
