'use client'
import { useTranslations } from 'next-intl'

type AnimatedBadgeProps = {
  icon: React.ReactNode
  borderColor: string
  className?: string
}

export function HeroBadge({
  icon = <span className="mr-2 text-primary text-lg">✨</span>,
  borderColor = 'via-indigo-100',
  className = 'mt-10',
}: Partial<AnimatedBadgeProps>) {
  const t = useTranslations('landingpage.hero.badge')
  const text = t('text', { fallback: 'Enjoy a 1 month free trial' })

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
        className={`inline-flex rounded-full p-[1px] bg-gradient-to-r from-transparent ${borderColor} to-transparent [background-size:400%_100%] ${className}`}
        style={{ animation: 'move-bg 10s linear infinite' }}
      >
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/5 to-secondary/10 border border-primary/10 px-4 py-1">
          {icon}
          <span className="text-sm font-medium text-primary">{text}</span>
        </div>
      </div>
    </>
  )
}
