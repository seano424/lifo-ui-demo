'use client'
import { useCurrentUser } from '@/hooks/use-users'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'

type AnimatedBadgeProps = {
  icon: React.ReactNode
  borderColor: string
  className?: string
}

export function HeroBadge({
  icon = <span className="mr-2 text-primary text-lg">✨</span>,
  borderColor = 'via-indigo-100',
  className = '',
}: Partial<AnimatedBadgeProps>) {
  const t = useTranslations('landingpage.hero.badge')
  const { data: currentUser } = useCurrentUser()
  const text = currentUser
    ? t('welcomeBack')
    : t('text', { fallback: 'Enjoy a 1 month free trial' })
  const iconToShow = currentUser ? <span className="mr-2 text-green-600 text-lg">👋</span> : icon

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
        className={`inline-flex rounded-full p-[1px] max-w-full transition-all duration-300 opacity-100`}
        style={
          !currentUser
            ? {
                animation: 'move-bg 10s linear infinite',
                backgroundImage: `linear-gradient(to right, transparent, ${borderColor}, transparent)`,
                backgroundSize: '400% 100%',
              }
            : {
                backgroundImage: `linear-gradient(to right, transparent, ${borderColor}, transparent)`,
                backgroundSize: '400% 100%',
              }
        }
      >
        <Badge variant="primary">
          {iconToShow}
          <span className=" text-primary truncate">{text}</span>
        </Badge>
      </div>
    </div>
  )
}
