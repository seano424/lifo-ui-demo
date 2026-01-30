import { Typography } from '@/components/ui/typography'
import { notFound } from 'next/navigation'

export default function PlaygroundPage() {
  // Block access to playground in production
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <div className="p-8">
      <Typography variant="h1">Development Playground</Typography>
      <Typography variant="p" color="muted">
        Internal testing utilities - not available in production
      </Typography>
    </div>
  )
}
