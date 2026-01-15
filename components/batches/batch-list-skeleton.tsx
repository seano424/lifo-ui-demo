import { useTranslations } from 'next-intl'
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
    <Table
      style={{
        tableLayout: 'fixed',
        borderCollapse: 'separate',
        borderSpacing: 0,
      }}
    >
      <TableHeader>
        <TableRow className="border-b-2 border-border">
          <TableHead className="py-3" style={{ width: 90 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.batchNumber')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 200 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.product')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 150 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.location')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 140 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.expiryDate')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 120 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.stock')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 110 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.costPrice')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 110 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.sellPrice')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 100 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.status')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 140 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('headers.createdAt')}
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={`skeleton-${i + 1}`} className="border-b border-border">
            <TableCell className="py-4" style={{ width: 90 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 200 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 150 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 120 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 110 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 110 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 100 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
