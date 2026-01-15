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

export function ProductListSkeleton() {
  const t = useTranslations('productTable')

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
          <TableHead className="py-3" style={{ width: 300 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('product')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 100 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('totalStock')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 130 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('activeBatches')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 110 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('dateAdded')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 140 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('category')}
            </span>
          </TableHead>
          <TableHead className="py-3" style={{ width: 140 }}>
            <span className="text-xs text-foreground/80 font-semibold uppercase tracking-wide">
              {t('brand')}
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={`skeleton-${i + 1}`} className="border-b border-border">
            <TableCell className="py-4" style={{ width: 300 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 100 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 130 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 110 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4" style={{ width: 140 }}>
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
