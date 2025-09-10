import { useTranslations } from 'next-intl'
import { ArrowUpDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ProductListSkeleton() {
  const t = useTranslations('productTable')

  return (
    <Card className="border-0 border-t rounded-t-none shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('product')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('category')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('brand')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                {t('totalStock')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                {t('activeBatches')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('dateAdded')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 20 }).map((_, i) => (
            <TableRow key={`skeleton-${i + 1}`}>
              <TableCell className="border-r border-border/50 flex items-center justify-center">
                <Skeleton className="h-12 w-64 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-full rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-full rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-full rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-full rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-full rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-12 w-full rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
