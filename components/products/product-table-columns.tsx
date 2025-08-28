'use client'

import type { ColumnDef, Header } from '@tanstack/react-table'
import { Building2, Edit, Euro, Eye, MoreHorizontal, Package, Tag, Trash2 } from 'lucide-react'
import { SortableHeader } from '@/components/products/sortable-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Product, ProductSort, SortField } from '@/lib/queries/products'
import { Typography } from '../ui/typography'

interface ColumnResizerProps {
  header: Header<Product, unknown>
}

function ColumnResizer({ header }: ColumnResizerProps) {
  return (
    <div
      className={`absolute right-0 top-0 h-full w-2 cursor-col-resize bg-transparent z-10 ${
        header.column.getIsResizing() ? '' : ''
      }`}
      style={{
        userSelect: 'none' as const,
        touchAction: 'none' as const,
      }}
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDoubleClick={() => {
        header.column.resetSize()
      }}
    >
      <div
        className={`w-0.5 h-full ml-auto transition-all ${
          header.column.getIsResizing() ? 'bg-brand-secondary' : 'bg-transparent hover:bg-border'
        }`}
      />
    </div>
  )
}

const getCategoryBadgeColor = (category: string) => {
  const colors = {
    fresh_produce: 'bg-green-100 text-green-800 border-green-200',
    fresh_meat_fish: 'bg-red-100 text-red-800 border-red-200',
    bakery_fresh: 'bg-orange-100 text-orange-800 border-orange-200',
    dairy: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    deli_prepared: 'bg-pink-100 text-pink-800 border-pink-200',
    frozen: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    dry_goods: 'bg-amber-100 text-amber-800 border-amber-200',
    beverages: 'bg-blue-100 text-blue-800 border-blue-200',
    spices_condiments: 'bg-purple-100 text-purple-800 border-purple-200',
    canned_jarred: 'bg-stone-100 text-stone-800 border-stone-200',
    chilled_packaged: 'bg-teal-100 text-teal-800 border-teal-200',
    pantry_staples: 'bg-slate-100 text-slate-800 border-slate-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200',
  }
  return colors[category?.toLowerCase() as keyof typeof colors] || colors.other
}

export function createProductTableColumns({
  currentSort,
  updateSort,
  updateProductPrice,
  deleteProduct,
  isUpdating,
  DEFAULT_COLUMN_WIDTHS,
}: {
  data: Product[]
  currentSort: ProductSort
  updateSort: (field: SortField) => void
  updateProductPrice: (id: string, price: number) => void
  deleteProduct: (id: string) => void
  isUpdating: boolean
  DEFAULT_COLUMN_WIDTHS: Record<string, number>
}): ColumnDef<Product>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => (
        <SortableHeader field="name" currentSort={currentSort} updateSort={updateSort}>
          Product
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium truncate" title={row.original.name}>
            {row.original.name || 'Unnamed Product'}
          </div>
          <div
            className="text-sm text-muted-foreground truncate font-mono"
            title={row.original.sku}
          >
            SKU: {row.original.sku || 'N/A'}
          </div>
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.name || 250,
      minSize: 150,
      maxSize: 400,
      enableResizing: true,
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: () => (
        <SortableHeader field="category" currentSort={currentSort} updateSort={updateSort}>
          Category
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          {row.original.category_display_name ? (
            <Badge
              variant="outline"
              className={`${getCategoryBadgeColor(row.original.category_display_name)}`}
            >
              {row.original.category_display_name}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Uncategorized</span>
          )}
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.category || 150,
      minSize: 100,
      maxSize: 200,
      enableResizing: true,
    },
    {
      id: 'brand',
      accessorKey: 'brand',
      header: () => (
        <SortableHeader field="brand" currentSort={currentSort} updateSort={updateSort}>
          Brand
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="truncate" title={row.original.brand || 'N/A'}>
            {row.original.brand || 'N/A'}
          </span>
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.brand || 150,
      minSize: 80,
      maxSize: 200,
      enableResizing: true,
    },
    {
      id: 'total_stock',
      accessorKey: 'total_stock',
      header: () => (
        <SortableHeader
          field="total_stock"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          Total Stock
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-medium">{row.original.total_stock || 0}</div>
          {/* <div className="text-xs text-muted-foreground">{row.original.unit_type || 'units'}</div> */}
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.total_stock || 80,
      minSize: 60,
      maxSize: 120,
      enableResizing: true,
    },
    // {
    //   id: 'base_selling_price',
    //   accessorKey: 'base_selling_price',
    //   header: () => (
    //     <SortableHeader
    //       field="base_selling_price"
    //       currentSort={currentSort}
    //       updateSort={updateSort}
    //       className="justify-end"
    //     >
    //       Price
    //     </SortableHeader>
    //   ),
    //   cell: ({ row }) => (
    //     <div className="text-right">
    //       <div className="flex items-center justify-end gap-1 font-bold">
    //         <Euro className="h-3 w-3 text-muted-foreground flex-shrink-0" />
    //         <span title={`€${Number(row.original.base_selling_price || 0).toFixed(2)}`}>
    //           {Number(row.original.base_selling_price || 0).toFixed(2)}
    //         </span>
    //       </div>
    //       <div className="text-xs text-muted-foreground">
    //         Cost: €{Number(row.original.base_cost_price || 0).toFixed(2)}
    //       </div>
    //     </div>
    //   ),
    //   size: DEFAULT_COLUMN_WIDTHS.base_selling_price || 100,
    //   minSize: 80,
    //   maxSize: 120,
    //   enableResizing: true,
    // },
    {
      id: 'active_batches_count',
      accessorKey: 'active_batches_count',
      header: () => (
        <SortableHeader
          field="active_batches_count"
          currentSort={currentSort}
          updateSort={updateSort}
          className="justify-end"
        >
          Active Batches
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Typography variant="small" className="flex items-center gap-2 justify-end text-right">
          <span>{row.original.active_batches_count || 0}</span>
        </Typography>
      ),
      size: DEFAULT_COLUMN_WIDTHS.active_batches_count || 120,
      minSize: 100,
      maxSize: 140,
      enableResizing: true,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: () => (
        <SortableHeader field="created_at" currentSort={currentSort} updateSort={updateSort}>
          Date Added
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : 'N/A'}
        </div>
      ),
      size: DEFAULT_COLUMN_WIDTHS.created_at || 100,
      minSize: 80,
      maxSize: 120,
      enableResizing: true,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isUpdating}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Package className="mr-2 h-4 w-4" />
              View Batches
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit Product
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                const currentPrice = row.original.base_selling_price || 0
                const newPrice = prompt('Enter new price (€):', currentPrice.toString())
                if (newPrice && !Number.isNaN(Number(newPrice))) {
                  updateProductPrice(row.original.product_id, Number(newPrice))
                }
              }}
            >
              <Euro className="mr-2 h-4 w-4" />
              Update Price
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (confirm('Are you sure you want to delete this product?')) {
                  deleteProduct(row.original.product_id)
                }
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Product
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableResizing: false,
      size: DEFAULT_COLUMN_WIDTHS.actions || 60,
      minSize: 50,
    },
  ]
}

export { ColumnResizer }
