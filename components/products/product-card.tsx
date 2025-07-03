'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, DollarSign, Lock } from 'lucide-react'
import type { Product } from '@/lib/queries/products'
import { usePermissions } from '@/hooks/use-users'
import { toast } from 'sonner'
import { Typography } from '@/components/ui/typography'

interface ProductCardProps {
  product: Product
  onDelete: () => void
  onUpdatePrice: (newPrice: number) => void
  isDeleting: boolean
  isUpdating: boolean
}

export function ProductCard({
  product,
  onDelete,
  onUpdatePrice,
  isDeleting,
  isUpdating,
}: ProductCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const permissions = usePermissions()

  const canEdit = permissions.canEditProduct(product.created_by ?? '')
  const canDelete = permissions.canDeleteProduct(product.created_by ?? '')

  const handleQuickPriceUpdate = () => {
    if (!canEdit) {
      toast.error('You do not have permission to edit this product')
      return
    }

    const newPrice = prompt('Enter new price:', product.base_selling_price.toString())
    if (newPrice && !isNaN(Number(newPrice))) {
      onUpdatePrice(Number(newPrice))
    }
  }

  const handleDelete = () => {
    if (!canDelete) {
      toast.error('You do not have permission to delete this product')
      return
    }

    if (window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      onDelete()
    }
  }

  return (
    <Card className="relative group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle>
              <Typography variant="h3" className="truncate">
                {product.name}
              </Typography>
            </CardTitle>
            <Typography variant="p" color="muted" className="truncate">
              {product.sku}
            </Typography>

            <div className="flex items-center gap-2 mt-1">
              {product.created_by === permissions.userId && (
                <Badge variant="outline" className="text-xs">
                  Owner
                </Badge>
              )}
              {permissions.isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  Admin
                </Badge>
              )}
              {permissions.isManager && !permissions.isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  Manager
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
                    <DropdownMenuItem onClick={handleQuickPriceUpdate}>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Update Price
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        /* Open edit modal */
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Product
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Product
                  </DropdownMenuItem>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Category</span>
            <Badge variant="outline">{product.category}</Badge>
          </div>

          {product.brand && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Brand</span>
              <span className="font-medium">{product.brand}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Stock</span>
            <span className="font-medium">
              {product.total_stock} {product.unit_type}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="text-right">
            <div className="text-2xl font-bold">${product.base_selling_price}</div>
            <div className="text-xs text-muted-foreground">Cost: ${product.base_cost_price}</div>
          </div>

          <div className="text-xs text-muted-foreground">
            {product.active_batches_count} active batch
            {product.active_batches_count !== 1 ? 'es' : ''}
          </div>
        </div>
      </CardFooter>

      {(isDeleting || isUpdating) && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
          <div className="text-sm font-medium">{isDeleting ? 'Deleting...' : 'Updating...'}</div>
        </div>
      )}
    </Card>
  )
}
