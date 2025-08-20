import { useTranslations } from 'next-intl'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export function BatchListSkeleton() {
  const t = useTranslations('batches.table')

  return (
    <Card className="border-0 shadow-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('headers.batchNumber')}</TableHead>
            <TableHead>{t('headers.product')}</TableHead>
            <TableHead>{t('headers.supplier')}</TableHead>
            <TableHead>{t('headers.expiryDate')}</TableHead>
            <TableHead className="text-right">{t('headers.stock')}</TableHead>
            <TableHead className="text-right">{t('headers.costPrice')}</TableHead>
            <TableHead className="text-right">{t('headers.sellPrice')}</TableHead>
            <TableHead>{t('headers.status')}</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
