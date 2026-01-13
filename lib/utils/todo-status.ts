import { addDays, differenceInDays, isBefore, isToday, startOfDay } from 'date-fns'

export interface TodoDateInfo {
  expiryDate: Date
  expiryStartOfDay: Date
  todayStartOfDay: Date
  isExpiring: boolean
  isExpiringToday: boolean
  isExpiringTomorrow: boolean
  daysUntilExpiry: number
}

/**
 * Calculate comprehensive date information for a todo item
 * This centralizes all date calculations to avoid duplication and improve performance
 */
export function calculateTodoDateInfo(expiryDateString: string | null): TodoDateInfo {
  const expiryDate = expiryDateString ? new Date(expiryDateString) : new Date()
  const today = new Date()
  const expiryStartOfDay = startOfDay(expiryDate)
  const todayStartOfDay = startOfDay(today)

  const isExpiring = isBefore(expiryStartOfDay, todayStartOfDay)
  const isExpiringToday = isToday(expiryDate)
  const isExpiringTomorrow =
    !isExpiring && !isExpiringToday && isBefore(expiryStartOfDay, addDays(todayStartOfDay, 2))

  const daysUntilExpiry = differenceInDays(expiryStartOfDay, todayStartOfDay)

  return {
    expiryDate,
    expiryStartOfDay,
    todayStartOfDay,
    isExpiring,
    isExpiringToday,
    isExpiringTomorrow,
    daysUntilExpiry,
  }
}

export type ButtonVariantType = 'destructive' | 'outline' | 'ghost'

export interface ActionButtonConfig {
  text: string
  variant: ButtonVariantType
  icon?: React.ElementType
}

export interface StatusBadgeConfig {
  text: string
  color: string
}
