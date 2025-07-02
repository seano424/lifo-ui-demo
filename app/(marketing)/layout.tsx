import { DeployButton } from '@/components/deploy-button'
import { EnvVarWarning } from '@/components/env-var-warning'
import { AuthButton } from '@/components/auth-button'
import { hasEnvVars } from '@/lib/utils'
import Link from 'next/link'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl gap-5 flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <Link href={'/'}>LIFO.AI</Link>
            {/* <div className="items-center gap-2 hidden md:flex">
              <DeployButton />
            </div> */}
          </div>
          <div className="flex items-center gap-2">
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
