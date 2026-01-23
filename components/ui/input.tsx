import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  showPasswordToggle?: boolean
  size?: 'sm' | 'default' | 'lg' | 'xl'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showPasswordToggle, size = 'default', ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const isPassword = type === 'password'
    const shouldShowToggle = showPasswordToggle && isPassword

    const inputType = isPassword && showPassword ? 'text' : type

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      default: 'px-6 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-lg',
    }

    return (
      <div className="relative w-full">
        <input
          type={inputType}
          className={cn(
            'flex w-full rounded-2xl border border-input bg-background shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            sizeClasses[size],
            shouldShowToggle && 'pr-10',
            className,
          )}
          ref={ref}
          {...props}
        />
        {shouldShowToggle && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
