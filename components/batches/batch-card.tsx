'use client'

import { addDays, formatDistanceToNow, isBefore } from 'date-fns'
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  Edit,
  Lock,
  MapPin,
  MoreHorizontal,
  Package,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Typography } from '@/components/ui/typography'
import { usePermissions } from '@/hooks/use-users'
import type { BatchWithProduct } from '@/lib/queries/batches'

interface BatchCardProps {
  batch: BatchWithProduct
  onDelete: () => void
  onUpdateQuantity: (newQuantity: number) => void
  onUpdatePrice: (costPrice: number, sellingPrice: number) => void
  onUpdateLocation: (locationCode: string) => void
  onMarkAsExpired: () => void
  onMarkAsDamaged: () => void
  onMarkAsSoldOut: () => void
  isDeleting: boolean
  isUpdating: boolean
  showProductInfo?: boolean
}

export function BatchCard({
  batch,
  onDelete,
  onUpdateQuantity,
  onUpdatePrice,
  onUpdateLocation,
  onMarkAsExpired,
  onMarkAsDamaged,
  onMarkAsSoldOut,
  isDeleting,
  isUpdating,
  showProductInfo = true,
}: BatchCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const permissions = usePermissions()

  const canEdit = permissions.canEditProduct(batch.created_by ?? '')
  const canDelete = permissions.canDeleteProduct(batch.created_by ?? '')

  // Calculate expiry status
  const expiryDate = new Date(batch.expiry_date)
  const today = new Date()
  const in3Days = addDays(today, 3)
  const in7Days = addDays(today, 7)

  const isExpired = isBefore(expiryDate, today)
  const isExpiringCritical = !isExpired && isBefore(expiryDate, in3Days)
  const isExpiringWarning = !isExpired && !isExpiringCritical && isBefore(expiryDate, in7Days)

  const getStatusBadge = () => {
    switch (batch.status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        )
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>
      case 'damaged':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            Damaged
          </Badge>
        )
      case 'sold_out':
        return <Badge variant="outline">Sold Out</Badge>
      case 'reserved':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Reserved
          </Badge>
        )
      default:
        return <Badge variant="outline">{batch.status}</Badge>
    }
  }

  const getExpiryBadge = () => {
    if (isExpired) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      )
    }
    if (isExpiringCritical) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Critical
        </Badge>
      )
    }
    if (isExpiringWarning) {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-100 text-yellow-800 flex items-center gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          Warning
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Fresh
      </Badge>
    )
  }

  const handleQuickQuantityUpdate = () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this batch')
      return
    }

    const newQuantity = prompt('Enter new quantity:', batch.current_quantity.toString())
    if (newQuantity && !Number.isNaN(Number(newQuantity)) && Number(newQuantity) >= 0) {
      onUpdateQuantity(Number(newQuantity))
    }
  }

  const handleQuickPriceUpdate = () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this batch')
      return
    }

    const costPrice = prompt('Enter cost price:', batch.cost_price.toString())
    if (!costPrice || Number.isNaN(Number(costPrice))) return

    const sellingPrice = prompt('Enter selling price:', batch.selling_price.toString())
    if (!sellingPrice || Number.isNaN(Number(sellingPrice))) return

    onUpdatePrice(Number(costPrice), Number(sellingPrice))
  }

  const handleQuickLocationUpdate = () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this batch')
      return
    }

    const newLocation = prompt('Enter location code:', batch.location_code || '')
    if (newLocation !== null) {
      onUpdateLocation(newLocation)
    }
  }

  const handleDelete = () => {
    if (!canDelete) {
      toast.error('You do not have permission to delete this batch')
      return
    }

    if (window.confirm(`Are you sure you want to delete batch "${batch.batch_number}"?`)) {
      onDelete()
    }
  }

  const handleStatusChange = (action: 'expired' | 'damaged' | 'sold_out') => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this batch')
      return
    }

    const messages = {
      expired: `Mark batch "${batch.batch_number}" as expired?`,
      damaged: `Mark batch "${batch.batch_number}" as damaged?`,
      sold_out: `Mark batch "${batch.batch_number}" as sold out?`,
    }

    if (window.confirm(messages[action])) {
      switch (action) {
        case 'expired':
          onMarkAsExpired()
          break
        case 'damaged':
          onMarkAsDamaged()
          break
        case 'sold_out':
          onMarkAsSoldOut()
          break
      }
    }
  }

  return (
    <Card
      className={`relative group hover:shadow-md transition-shadow ${
        isExpired
          ? 'border-red-200 bg-red-50/30'
          : isExpiringCritical
            ? 'border-red-300 bg-red-50/20'
            : isExpiringWarning
              ? 'border-yellow-300 bg-yellow-50/20'
              : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate flex items-center gap-2">
              {batch.batch_number}
              {getStatusBadge()}
            </CardTitle>

            {showProductInfo && batch.products && (
              <div className="mt-1">
                <Typography variant="p" color="muted">
                  {batch.products.name}
                </Typography>
                <Typography variant="p" color="muted">
                  SKU: {batch.products.sku}
                </Typography>
              </div>
            )}

            <div className="flex items-center gap-2 mt-2">
              {getExpiryBadge()}
              {batch.created_by === permissions.userId && (
                <Badge variant="outline" className="text-xs">
                  Owner
                </Badge>
              )}
            </div>
          </div>

          {(canEdit || canDelete) && (
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isDeleting || isUpdating}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-background" align="end">
                {canEdit && (
                  <>
                    <DropdownMenuItem onClick={handleQuickQuantityUpdate}>
                      <Package className="mr-2 h-4 w-4" />
                      Update Quantity
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleQuickPriceUpdate}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Update Prices
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleQuickLocationUpdate}>
                      <MapPin className="mr-2 h-4 w-4" />
                      Update Location
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        /* Open edit modal */
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Batch
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('expired')}
                      className="text-orange-600 focus:text-orange-600"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Mark as Expired
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('damaged')}
                      className="text-orange-600 focus:text-orange-600"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Mark as Damaged
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('sold_out')}
                      className="text-blue-600 focus:text-blue-600"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Sold Out
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Batch
                    </DropdownMenuItem>
                  </>
                )}
                {!canEdit && !canDelete && (
                  <DropdownMenuItem disabled>
                    <Lock className="mr-2 h-4 w-4" />
                    No permissions
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-3">
          {/* Quantity and Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                Current Stock
              </div>
              <div className="text-lg font-semibold">
                {batch.current_quantity} {batch.products?.unit_type}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3" />
                Available
              </div>
              <div className="text-lg font-semibold text-green-600">
                {batch.available_quantity} {batch.products?.unit_type}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Expiry Date
              </span>
              <span
                className={`font-medium ${
                  isExpired
                    ? 'text-red-600'
                    : isExpiringCritical
                      ? 'text-red-500'
                      : isExpiringWarning
                        ? 'text-yellow-600'
                        : 'text-green-600'
                }`}
              >
                {new Date(batch.expiry_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Days to Expiry</span>
              <span
                className={`font-medium ${
                  isExpired
                    ? 'text-red-600'
                    : isExpiringCritical
                      ? 'text-red-500'
                      : isExpiringWarning
                        ? 'text-yellow-600'
                        : 'text-green-600'
                }`}
              >
                {isExpired ? 'Expired' : formatDistanceToNow(expiryDate)}
              </span>
            </div>
          </div>

          {/* Location and Supplier */}
          <div className="space-y-2">
            {batch.location_code && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  Location
                </span>
                <span className="font-medium">{batch.location_code}</span>
              </div>
            )}
            {batch.supplier && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Truck className="h-3 w-3" />
                  Supplier
                </span>
                <span className="font-medium truncate max-w-[120px]" title={batch.supplier}>
                  {batch.supplier}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="text-right">
            <div className="text-xl font-bold">${batch.selling_price}</div>
            <div className="text-xs text-muted-foreground">Cost: ${batch.cost_price}</div>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium">
              ${(Number(batch.current_quantity) * Number(batch.selling_price)).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Total Value</div>
          </div>
        </div>
      </CardFooter>

      {(isDeleting || isUpdating) && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-2xl">
          <div className="text-sm font-medium">{isDeleting ? 'Deleting...' : 'Updating...'}</div>
        </div>
      )}
    </Card>
  )
}
