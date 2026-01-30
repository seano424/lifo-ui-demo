'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Typography } from './ui/typography'

export function ToastTest() {
  return (
    <div className="fixed bottom-4 left-4 flex flex-col gap-2 p-4 bg-white border rounded-lg shadow-lg z-50">
      <Typography variant="h3" color="primary">
        Toast Tests
      </Typography>
      <div className="flex flex-col gap-2">
        <Button
          onClick={() =>
            toast.success('Success toast with secondary color!', {
              description: 'This uses your blue secondary color',
            })
          }
          variant="secondary"
          size="sm"
        >
          Test Success (Secondary)
        </Button>

        <Button
          onClick={() =>
            toast.error('Error toast with primary color!', {
              description: 'This uses your purple primary color',
            })
          }
          variant="destructive"
          size="sm"
        >
          Test Error (Primary)
        </Button>

        <Button
          onClick={() =>
            toast.error('Session terminated!', {
              duration: 6000,
              description: 'This is the special session termination toast',
              className: 'session-termination-toast',
              style: {
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                border: '1px solid hsl(var(--primary))',
                borderRadius: '12px',
                fontWeight: '500',
              },
            })
          }
          variant="outline"
          size="sm"
        >
          Test Session Warning (Gradient)
        </Button>

        <Button
          onClick={() =>
            toast('Info toast with default styling', {
              description: 'This uses background/foreground colors',
            })
          }
          variant="ghost"
          size="sm"
        >
          Test Default
        </Button>
      </div>
    </div>
  )
}
