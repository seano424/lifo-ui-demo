import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SquareIconProps {
  /**
   * Size of the container in pixels (both width and height)
   * @default 40
   */
  containerSize?: number
  /**
   * Size of the image in pixels (both width and height)
   * @default 20
   */
  imageSize?: number
  /**
   * Additional CSS classes for the container
   */
  className?: string
}

export function SquareIcon({ containerSize = 40, imageSize = 20, className }: SquareIconProps) {
  return (
    <div
      className={cn('bg-gray-100 rounded-lg flex items-center justify-center shrink-0', className)}
      style={{ width: containerSize, height: containerSize }}
    >
      <Image src="/square/square-icon.svg" alt="Square" width={imageSize} height={imageSize} />
    </div>
  )
}
