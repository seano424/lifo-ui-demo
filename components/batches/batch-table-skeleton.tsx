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
import { BATCH_TABLE_COLUMN_CONFIG } from '@/components/batches/batch-table-columns'

export function BatchTableSkeleton() {
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
        <TableRow className="border-b border-border">
          {BATCH_TABLE_COLUMN_CONFIG.map(column => (
            <TableHead
              key={column.id}
              className="sticky top-0 bg-background z-10 py-3 px-4"
              style={{ width: column.width }}
            >
              <div
                className={`flex font-heading font-semibold items-center gap-1 ${column.align === 'right' ? 'justify-end' : ''}`}
              >
                <span className="text-sm text-foreground">{t(column.headerKey)}</span>
                {column.sortable !== false && <ArrowUpDownIcon className="h-3.5 w-3.5" />}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={`skeleton-${i + 1}`} className="border-none">
            {BATCH_TABLE_COLUMN_CONFIG.map(column => (
              <TableCell
                key={column.id}
                className={`py-3 px-4 ${column.align === 'right' ? 'text-right' : ''}`}
                style={{ width: column.width }}
              >
                {column.hasMultipleLines ? (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </div>
                ) : (
                  <Skeleton
                    className={`h-5 w-full rounded ${column.align === 'right' ? 'ml-auto' : ''}`}
                  />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
