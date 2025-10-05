'use client'
import { useCurrentUser } from '@/hooks/use-users'
import { useTranslations } from 'next-intl'

type AnimatedBadgeProps = {
  icon: React.ReactNode
  borderColor: string
  className?: string
}

export function HeroBadge({
  icon = <span className="mr-2 text-primary text-lg">✨</span>,
  borderColor = 'via-indigo-100',
  className = 'mt-6',
}: Partial<AnimatedBadgeProps>) {
  const t = useTranslations('landingpage.hero.badge')
  const { data: currentUser } = useCurrentUser()
  const text = t('text', { fallback: 'Enjoy a 1 month free trial' })

  if (currentUser) return null

  return (
    <>
      <style>
        {`
          @keyframes move-bg {
            to {
              background-position: 400% 0;
            }
          }
        `}
      </style>
      <div
        className={`inline-flex rounded-full p-[1px] bg-gradient-to-r from-transparent ${borderColor} to-transparent [background-size:400%_100%] ${className} max-w-full`}
        style={{ animation: 'move-bg 10s linear infinite' }}
      >
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/5 to-secondary/10 border border-primary/10 px-3 sm:px-4 py-1 text-xs sm:text-sm">
          {icon}
          <span className="font-medium text-primary truncate">{text}</span>
        </div>
      </div>
    </>
  )
}
