import React from 'react'
import { Badge } from '@/components/ui/badge'

export const getStatusBadge = (status: string, tStatus: (key: string) => string) => {
  const variants = {
    active: 'default' as const,
    expired: 'destructive' as const,
    damaged: 'destructive' as const,
    sold_out: 'secondary' as const,
    reserved: 'outline' as const,
  }
  const statusMap: { [key: string]: string } = {
    active: 'active',
    expired: 'expired',
    damaged: 'damaged',
    sold_out: 'soldOut',
    reserved: 'reserved',
  }
  const translationKey = statusMap[status] || 'active'
  const translatedStatus =
    tStatus(translationKey as 'active' | 'expired' | 'damaged' | 'soldOut' | 'reserved') || status
  return (
    <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
      {translatedStatus}
    </Badge>
  )
}

export const getExpiryBadge = (
  expiryDate: string,
  tExpiry: (key: string, params?: { days: number }) => string,
) => {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (daysUntilExpiry < 0) {
    return <Badge variant="destructive">{tExpiry('expired')}</Badge>
  } else if (daysUntilExpiry <= 3) {
    return <Badge variant="destructive">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
  } else if (daysUntilExpiry <= 7) {
    return <Badge variant="secondary">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
  } else {
    return <Badge variant="outline">{tExpiry('daysLeft', { days: daysUntilExpiry })}</Badge>
  }
}
