'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import * as React from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  titleElement?: React.ReactNode
  children: React.ReactNode
  variant?: 'default' | 'fullHeight'
  className?: string
}

const BottomSheet = React.forwardRef<HTMLDivElement, BottomSheetProps>(
  ({ isOpen, onClose, title, titleElement, children, variant = 'default', className }, ref) => {
    const isMobile = useIsMobile()
    const contentRef = React.useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragY, setDragY] = React.useState(0)
    const startY = React.useRef(0)
    const currentY = React.useRef(0)

    const handleTouchStart = (e: React.TouchEvent) => {
      if (!isMobile) return
      setIsDragging(true)
      startY.current = e.touches[0].clientY
      currentY.current = 0
    }

    const handleTouchMove = (e: React.TouchEvent) => {
      if (!isDragging || !isMobile) return
      const deltaY = e.touches[0].clientY - startY.current
      if (deltaY > 0) {
        currentY.current = deltaY
        setDragY(deltaY)
      }
    }

    const handleTouchEnd = () => {
      if (!isDragging || !isMobile) return
      setIsDragging(false)

      if (currentY.current > 100) {
        onClose()
      }
      setDragY(0)
    }

    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }, [isOpen, onClose])

    return (
      <DialogPrimitive.Root open={isOpen} onOpenChange={open => !open && onClose()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            )}
            onClick={onClose}
          />
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              'fixed z-50 bg-[#F9F8F8] dark:bg-muted/60 shadow-xl',
              className,
              'focus:outline-none',
              isMobile
                ? [
                    'inset-x-0 bottom-0 rounded-t-4xl',
                    'data-[state=open]:animate-in data-[state=closed]:animate-out',
                    'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
                    'data-[state=open]:duration-300 data-[state=closed]:duration-200',
                    variant === 'fullHeight' ? 'h-[90vh]' : 'h-[75vh]',
                  ]
                : [
                    'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]',
                    'max-w-4xl rounded-2xl',
                    'data-[state=open]:animate-in data-[state=closed]:animate-out',
                    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                    'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                    'data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-top-[48%]',
                    'data-[state=open]:duration-200 data-[state=closed]:duration-150',
                    variant === 'fullHeight' ? 'h-[90vh]' : 'h-[75vh]',
                  ],
            )}
            style={{
              transform: isMobile && dragY > 0 ? `translateY(${dragY}px)` : undefined,
              transition: isDragging ? 'none' : undefined,
            }}
            aria-describedby={undefined}
          >
            <div className="flex flex-col h-full">
              {isMobile && (
                <div
                  className="flex justify-center pt-2 pb-1"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
                </div>
              )}

              <div
                className="flex items-center justify-between px-6 py-2"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {titleElement ? (
                  <DialogPrimitive.Title asChild>{titleElement}</DialogPrimitive.Title>
                ) : (
                  <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
                )}
                <DialogPrimitive.Close
                  className={cn(
                    'rounded-full p-2 bg-background',
                    'ring-offset-background transition-opacity',
                    'hover:opacity-70 focus:outline-none focus:ring-0 focus:ring-offset-0',
                    'disabled:pointer-events-none',
                  )}
                  onClick={onClose}
                >
                  <XIcon className="size-7" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>

              <div
                ref={contentRef}
                className={cn(
                  'flex-1 min-h-0 overflow-y-auto',
                  'scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent',
                )}
              >
                {children}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  },
)

BottomSheet.displayName = 'BottomSheet'

export { BottomSheet }
