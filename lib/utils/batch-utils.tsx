import { Badge } from '@/components/ui/badge'

export const getStatusBadge = (status: string, tStatus: (key: string) => string) => {
  const variants = {
    active: 'default' as const,
    draft: 'secondary' as const,
    expired: 'destructive' as const,
    damaged: 'destructive' as const,
    sold_out: 'secondary' as const,
    reserved: 'outline' as const,
  }
  const statusMap: { [key: string]: string } = {
    active: 'active',
    draft: 'draft',
    expired: 'expired',
    damaged: 'damaged',
    sold_out: 'soldOut',
    reserved: 'reserved',
  }
  const translationKey = statusMap[status] || 'active'
  const translatedStatus =
    tStatus(
      translationKey as 'active' | 'draft' | 'expired' | 'damaged' | 'soldOut' | 'reserved',
    ) || status
  return (
    <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
      {translatedStatus}
    </Badge>
  )
}

export const getExpiryBadge = (
  expiryDate: string | null,
  tExpiry: (key: string, params?: { days: number }) => string,
) => {
  // Handle null/missing expiry dates (draft batches)
  if (!expiryDate) {
    return <Badge variant="secondary">{tExpiry('noExpiryDate')}</Badge>
  }

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

/**
 * Check if a batch is in draft status (needs expiry date to be completed)
 */
export const isDraftBatch = (batch: { status?: string; expiry_date?: string | null }): boolean => {
  return batch.status === 'draft' || !batch.expiry_date
}

/**
 * Check if a batch can be scored by the AI (has expiry date and is active)
 */
export const canBeScored = (batch: { status?: string; expiry_date?: string | null }): boolean => {
  return !isDraftBatch(batch) && batch.status === 'active'
}
