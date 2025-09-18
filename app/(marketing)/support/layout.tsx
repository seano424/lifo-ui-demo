import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { ArrowLeft, Home, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Navigation Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/support" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <BookOpen size={20} />
                <Typography variant="p" className="font-medium">
                  LIFO Knowledge Base
                </Typography>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asLink href="/">
                <Home size={16} />
                Home
              </Button>
              <Button variant="ghost" size="sm" asLink href="/contact">
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {children}
    </div>
  )
}