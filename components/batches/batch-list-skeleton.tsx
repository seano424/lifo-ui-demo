import { ArrowUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function BatchListSkeleton() {
  const t = useTranslations('batches.table')

  return (
    <Card className="border-0 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('headers.batchNumber')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>{t('headers.product')}</TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('headers.supplier')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('headers.expiryDate')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                {t('headers.stock')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                {t('headers.costPrice')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">
              <div className="flex items-center justify-end gap-1">
                {t('headers.sellPrice')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-1">
                {t('headers.status')}
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={`skeleton-${i + 1}`}>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
              <TableCell className="border-r border-border/50">
                <Skeleton className="h-12 w-32 rounded" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
