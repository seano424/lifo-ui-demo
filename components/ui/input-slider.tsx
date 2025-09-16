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

    // Calculate progress percentage for gradient
    const progressPercentage = ((value - min) / (max - min)) * 100

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

          {/* Slider */}
          <div className="flex-1">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleSliderChange}
              className={cn(
                'w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer',
                sliderClassName,
              )}
              style={{
                background: `linear-gradient(to right, ${sliderColor} 0%, ${sliderColor} ${progressPercentage}%, #e2e8f0 ${progressPercentage}%, #e2e8f0 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    )
  },
)

InputSlider.displayName = 'InputSlider'

export { InputSlider }
