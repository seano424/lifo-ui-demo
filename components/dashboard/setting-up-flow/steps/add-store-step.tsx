'use client'

import { useTranslations } from 'next-intl'
import { useInitiateSquareConnect } from '@/hooks/use-square-integration'
import { toast } from 'sonner'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { Typography } from '@/components/ui/typography'

export function AddStoreStep() {
  const t = useTranslations('setupFlow')
  const initiateSquareConnect = useInitiateSquareConnect()

  const handleSquareConnect = async () => {
    try {
      const response = await initiateSquareConnect.mutateAsync()
      if (response.authorization_url) {
        window.location.href = response.authorization_url
      } else {
        toast.error('Failed to get authorization URL')
      }
    } catch (error) {
      console.error('Square connection error:', error)
    }
  }

  return (
    <div className="flex flex-col items-center gap-10 ob-animate-in">
      {/* Heading block */}
      <div className="flex flex-col items-center gap-5">
        <Typography
          variant="h1"
          className="font-fraunces font-black text-center max-w-[440px] xl:text-5xl"
        >
          Connect your Square account
        </Typography>
        <Typography variant="p" className="text-center">
          {t('steps.addStore.description')}
        </Typography>
      </div>

      {/* Connect card */}
      <button
        type="button"
        onClick={handleSquareConnect}
        className="group w-full max-w-[480px] flex gap-5 rounded-2xl p-7 bg-white cursor-pointer transition-all duration-250 ease-out hover:border-secondary hover:-translate-y-px hover:shadow-[0_0_0_3px_rgba(80,36,255,0.1),0_4px_12px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <div className="p-2 bg-primary-50 rounded-lg h-fit">
          <Image src="/square/square-icon.svg" alt="Square" width={40} height={40} />
        </div>

        <div className="flex flex-col gap-1 text-left flex-1">
          <Typography variant="h4" className="font-bold lg:text-xl">
            Square
          </Typography>
          <Typography variant="p">{t('steps.addStore.squareDescription')}</Typography>
        </div>

        <ChevronRight
          size={24}
          className="group-hover:translate-x-1 transition-all duration-500 ease-out group-hover:scale-110"
        />
      </button>
    </div>
  )
}
