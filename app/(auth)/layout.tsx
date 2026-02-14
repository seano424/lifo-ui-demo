import Image from 'next/image'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh w-full overflow-hidden">
      {/* Light Mode Background */}
      <div className="absolute inset-0 mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:hidden">
        <div className="absolute inset-0 bg-linear-to-b from-white/90 to-white/40 z-10" />
        <Image
          src="/images/bg.svg"
          alt="Background"
          fill
          className="object-cover rotate-180 scale-x-200"
          priority
        />
      </div>

      {/* Dark Mode Background */}
      <div className="absolute inset-0 dark:block hidden">
        <div className="absolute inset-0 bg-linear-to-b from-background/90 to-background/40 z-10" />
        <Image
          src="/images/bg.svg"
          alt="Background"
          fill
          className="brightness-30 contrast-170 scale-y-200 scale-x-200 xl:-translate-x-10"
          priority
        />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-svh">{children}</div>
    </div>
  )
}
