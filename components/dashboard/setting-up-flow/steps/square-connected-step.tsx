'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { useSquareStores } from '@/hooks/use-store-overviews'
import { PackagePlusIcon } from 'lucide-react'

interface SquareConnectedStepProps {
  onContinue: () => void
}

export function SquareConnectedStep({ onContinue }: SquareConnectedStepProps) {
  const { data: squareStores } = useSquareStores()

  useEffect(() => {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2DB87A', '#34D399', '#6EE7B7', '#FCD34D', '#F59E0B', '#60A5FA', '#A78BFA'],
    })
  }, [])

  const totalProducts = squareStores.reduce((sum, s) => sum + s.product_count, 0)

  let foundLine: string
  if (squareStores.length === 1) {
    foundLine = `We found ${squareStores[0].store_name} and synced ${totalProducts} products!`
  } else if (squareStores.length > 1) {
    foundLine = `We found ${squareStores.length} stores and synced ${totalProducts} products!`
  } else {
    foundLine = 'We found your stores!'
  }

  return (
    <div className="flex flex-col items-center gap-10 ob-animate-in">
      <div className="flex flex-col items-center gap-5">
        <Typography variant="h1" className="font-fraunces font-black text-center">
          Square connected!
        </Typography>
        <Typography variant="h5" color="muted" className="text-center lg:text-xl">
          {foundLine} Lifo adds expiry tracking on top of your existing Square products. Nothing
          changes on your POS.
        </Typography>
      </div>

      {/* <Button size="xl" className="w-full max-w-[480px]" onClick={onContinue}>
        Add your first expiry dates 🎉
      </Button> */}
      <Button size="lg" variant="secondary" onClick={onContinue} className="group rounded-3xl">
        Add your first expiry dates
        <PackagePlusIcon className="w-5 h-5 -rotate-45 transition-transform duration-300 ease-in-out group-hover:translate-x-px group-hover:-translate-y-px" />
      </Button>
    </div>
  )
}
