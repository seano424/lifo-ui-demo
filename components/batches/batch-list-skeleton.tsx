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
import { ArrowUpDownIcon } from 'lucide-react'

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
          <TableHead className="py-3 px-4" style={{ width: 140 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.batchNumber')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
          <TableHead className="py-3 px-4" style={{ width: 200 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.product')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
          <TableHead className="py-3 px-4" style={{ width: 150 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.location')}</span>
            </div>
          </TableHead>
          <TableHead className="py-3 px-4 text-right" style={{ width: 140 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.expiryDate')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
          <TableHead className="py-3 px-4 text-right" style={{ width: 140 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.stock')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
          <TableHead className="py-3 px-4 text-right" style={{ width: 140 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.costPrice')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
          <TableHead className="py-3 px-4 text-right" style={{ width: 140 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.sellPrice')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
          <TableHead className="py-3 px-4 text-right" style={{ width: 140 }}>
            <div className="flex items-center gap-1">
              <span className="text-sm text-foreground">{t('headers.status')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
          <TableHead className="py-3 px-4 text-right" style={{ width: 140 }}>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-sm text-foreground">{t('headers.createdAt')}</span>
              <ArrowUpDownIcon className="h-3.5 w-3.5" />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={`skeleton-${i + 1}`} className="border-b border-border">
            <TableCell className="py-4 px-4" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4" style={{ width: 200 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4 text-right" style={{ width: 150 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4 text-right" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4 text-right" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4 text-right" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4 text-right" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4 text-right" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
            <TableCell className="py-4 px-4 text-right" style={{ width: 140 }}>
              <Skeleton className="h-5 w-full rounded" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
