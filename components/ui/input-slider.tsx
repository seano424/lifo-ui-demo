import * as React from 'react'
import { cn } from '@/lib/utils'
import { Typography } from './typography'

export interface InputSliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  suffix?: string
  className?: string
  inputClassName?: string
  sliderClassName?: string
  isPercentage?: boolean
  actionButton?: React.ReactNode
}

const InputSlider = React.forwardRef<HTMLDivElement, InputSliderProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      step = 1,
      label,
      suffix,
      className,
      inputClassName,
      sliderClassName,
      isPercentage = false,
      actionButton,
      ...props
    },
    ref,
  ) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10)
      if (!Number.isNaN(newValue)) {
        // Clamp the value to the valid range
        const clampedValue = Math.max(min, Math.min(max, newValue))
        onChange(clampedValue)
      }
    }

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10)
      onChange(newValue)
    }

    // Calculate progress percentage to match native thumb positioning
    // Native range inputs position thumbs with some inset from edges
    const progressRatio = max === min ? 1 : (value - min) / (max - min)
    const thumbInset = 2.5 // Percentage inset from each edge for thumb positioning
    const progressPercentage = thumbInset + progressRatio * (100 - 2 * thumbInset)

    return (
      <div ref={ref} className={cn('flex flex-col gap-3', className)} {...props}>
        <div className="flex flex-col gap-8">
          {/* Manual Input */}
          <div
            className={cn(
              'shrink-0 relative items-center flex gap-4',
              label ? 'justify-between' : 'justify-end',
            )}
          >
            {label && (
              <Typography variant="p" className="xs:text-lg">
                {label}
              </Typography>
            )}
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={handleInputChange}
                  className={cn(
                    'h-12  text-xl px-4 border rounded-2xl',
                    'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary',
                    'bg-background border-muted',
                    isPercentage &&
                      '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    inputClassName,
                  )}
                />

                {isPercentage && (
                  <Typography className="absolute right-4 top-1/2 -translate-y-1/2">%</Typography>
                )}
              </div>

              {actionButton && actionButton}
            </div>
          </div>

          {/* Slider */}
          <div className="flex-1 relative flex items-center">
            {/* Background track */}
            <div className="w-full h-[6px] bg-linear-to-r from-muted to-muted rounded-full absolute" />
            {/* Progress fill */}
            <div
              className="h-[6px] min-w-12 bg-linear-to-r from-primary-700  to-primary-900 transition-all ease-in-out rounded-full  absolute left-0 pointer-events-none flex justify-end items-center"
              style={{
                width: `${progressRatio === 1 ? 100 : Math.max(6, progressPercentage)}%`,
              }}
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-brand-white shadow-lg border border-muted" />
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleSliderChange}
              className={cn(
                'w-full h-8 opacity-0 bg-transparent rounded-full appearance-none cursor-pointer relative z-10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:mt-[-4px] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:border-gray-400 [&::-moz-range-thumb]:margin-top-[-4px]',
                sliderClassName,
              )}
            />
          </div>
        </div>
      </div>
    )
  },
)

InputSlider.displayName = 'InputSlider'

export { InputSlider }
