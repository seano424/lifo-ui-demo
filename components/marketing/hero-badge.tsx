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

  return (
    <div className={`h-[42px] sm:h-[48px] ${className}`}>
      {!currentUser && (
        <style>
          {`
            @keyframes move-bg {
              to {
                background-position: 400% 0;
              }
            }
          `}
        </style>
      )}
      <div
        className={`inline-flex rounded-full p-[1px] max-w-full transition-opacity duration-300 ${
          currentUser ? 'opacity-0' : 'opacity-100'
        }`}
        style={
          !currentUser
            ? {
                animation: 'move-bg 10s linear infinite',
                backgroundImage: `linear-gradient(to right, transparent, ${borderColor}, transparent)`,
                backgroundSize: '400% 100%',
              }
            : undefined
        }
      >
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/5 to-secondary/10 border border-primary/10 px-3 sm:px-4 py-1 text-xs sm:text-sm">
          {icon}
          <span className="font-medium text-primary truncate">{text}</span>
        </div>
      </div>
    </div>
  )
}
