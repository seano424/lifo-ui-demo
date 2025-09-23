import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputSliderProps {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  label?: string
  suffix?: string
  className?: string
  sliderColor?: string
  inputClassName?: string
  sliderClassName?: string
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
      sliderColor = '#8b5cf6',
      inputClassName,
      sliderClassName,
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
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{label}</label>
            <div className="text-right">
              <span className="text-lg font-bold">{value}</span>
              {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Manual Input */}
          <div className="flex-shrink-0 relative">
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleInputChange}
              className={cn(
                'h-8 px-2 text-sm text-center border rounded-md',
                'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary',
                'bg-background border-border',
                inputClassName,
              )}
            />
          </div>

          {/* Modern Slider */}
          <div className="flex-1 relative flex items-center">
            {/* Background track */}
            <div className="w-full h-7 bg-white rounded-full absolute" />
            {/* Progress fill */}
            <div
              className="h-7 bg-black rounded-full transition-all ease-in-out absolute left-0 pointer-events-none flex justify-end items-center p-px"
              style={{ width: `${progressRatio === 1 ? 100 : Math.max(6, progressPercentage)}%` }}
            >
              <div className="h-6 w-6 rounded-full bg-white" />
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
