'use client'

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import confetti from 'canvas-confetti'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Typography } from '../ui/typography'

export const SquareSuccessModal = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showSquareSuccessModal, setShowSquareSuccessModal] = useState(false)

  useEffect(() => {
    if (searchParams.get('square_connected') === 'true') {
      setShowSquareSuccessModal(true)
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2DB87A', '#34D399', '#6EE7B7', '#FCD34D', '#F59E0B', '#60A5FA', '#A78BFA'],
      })
      router.replace('/dashboard')
    }
  }, [searchParams, router])

  return (
    <Dialog open={showSquareSuccessModal} onOpenChange={setShowSquareSuccessModal}>
      <DialogContent className="max-w-sm text-center flex flex-col ob-animate-in">
        <DialogHeader>
          <DialogTitle>
            <span className="sr-only">Square connected!</span>
            <div className="flex flex-col items-center gap-5">
              <Typography
                variant="h1"
                className="font-fraunces font-black text-center max-w-[440px] xl:text-5xl"
              >
                Square connected!
              </Typography>
            </div>
          </DialogTitle>
        </DialogHeader>

        <DialogDescription>
          <span className="sr-only">
            We found your stores! Lifo adds expiry tracking on top of your existing Square catalog.
            Nothing changes on your POS.
          </span>
        </DialogDescription>

        <Typography variant="h5" color="muted" className="text-center mt-2 lg:text-xl">
          We found your stores! Lifo adds expiry tracking on top of your existing Square catalog.
          Nothing changes on your POS.
        </Typography>

        <Button size="xl" className="w-full mt-4" onClick={() => setShowSquareSuccessModal(false)}>
          Let&apos;s get started 🎉
        </Button>
      </DialogContent>
    </Dialog>
  )
}
