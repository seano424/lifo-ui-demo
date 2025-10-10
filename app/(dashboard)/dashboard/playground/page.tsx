import { notFound } from 'next/navigation'

export default function PlaygroundPage() {
  // Block access to playground in production
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Development Playground</h1>
      <p className="text-muted-foreground mt-2">
        Internal testing utilities - not available in production
      </p>
    </div>
  )
}
