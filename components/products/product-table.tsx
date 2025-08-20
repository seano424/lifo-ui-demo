'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Package } from 'lucide-react'
import { useBatches } from '@/hooks/use-batches'
import type { Product } from '@/types/inventory'

const getStatusColor = (status: Product['status']) => {
  switch (status) {
    case 'fresh':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'expiring-soon':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'expired':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'discounted':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'donated':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'sold':
      return 'bg-gray-100 text-gray-800 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusLabel = (status: Product['status']) => {
  switch (status) {
    case 'fresh':
      return 'Fresh'
    case 'expiring-soon':
      return 'Expiring Soon'
    case 'expired':
      return 'Expired'
    case 'discounted':
      return 'Discounted'
    case 'donated':
      return 'Donated'
    case 'sold':
      return 'Sold'
    default:
      return status
  }
}

const getDaysUntilExpiration = (expirationDate: string) => {
  const today = new Date()
  const expDate = new Date(expirationDate)
  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function ProductTable() {
  const { data } = useBatches()

  const sortedProducts = [...data].sort((a, b) => {
    const daysA = getDaysUntilExpiration(a.expiry_date)
    const daysB = getDaysUntilExpiration(b.expiry_date)
    return daysA - daysB
  })

  return (
    <Card className="w-full overflow-x-auto h-max">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Inventory - Batch Level Tracking
        </CardTitle>
        <CardDescription>
          Track individual product batches by expiration date. Take action before waste occurs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Batch ID</TableHead>
              <TableHead>Expiration Date</TableHead>
              <TableHead>Days Left</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.map(product => {
              const daysLeft = getDaysUntilExpiration(product.expiry_date)
              return (
                <TableRow key={product.batch_id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{product.products?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.products?.category}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.batch_id}</TableCell>
                  <TableCell>{new Date(product.expiry_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span
                      className={`font-medium ${
                        daysLeft < 0
                          ? 'text-red-600'
                          : daysLeft <= 3
                            ? 'text-orange-600'
                            : 'text-green-600'
                      }`}
                    >
                      {daysLeft < 0
                        ? `${Math.abs(daysLeft)} days ago`
                        : daysLeft === 0
                          ? 'Today'
                          : `${daysLeft} days`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{product.available_quantity}</span>
                    <span className="text-muted-foreground">/{product.current_quantity}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(product.status as Product['status'])}>
                      {getStatusLabel(product.status as Product['status'])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div
                        className={product.cost_price ? 'line-through text-muted-foreground' : ''}
                      >
                        €{product.cost_price.toFixed(2)}
                      </div>
                      {product.selling_price && (
                        <div className="text-blue-600 font-medium">
                          €{product.selling_price.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {product.status === 'fresh' || product.status === 'expiring-soon' ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {}}>Mark as Discounted</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {}}>Mark as Donated</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {}}>Mark as Sold</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-muted-foreground text-sm">No actions</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
