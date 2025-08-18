'use client'

import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslations } from 'next-intl'

interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
}

interface CsvPreviewTableProps {
  data: CsvPreviewItem[]
  updateCsvItemExpiry: (index: number, newExpiryDate: string) => void
}

export function CsvPreviewTable({ data, updateCsvItemExpiry }: CsvPreviewTableProps) {
  const t = useTranslations('csvUpload.preview.table')

  const columns: ColumnDef<CsvPreviewItem>[] = [
    {
      id: 'sku',
      header: () => t('sku'),
      accessorKey: 'SKU',
      size: 100,
      minSize: 80,
      maxSize: 120,
      cell: ({ getValue }) => (
        <div className="font-mono text-xs truncate" title={getValue() as string}>
          {getValue() as string}
        </div>
      ),
    },
    {
      id: 'product_name',
      header: () => t('productName'),
      accessorKey: 'Product_Name',
      size: 200,
      minSize: 150,
      maxSize: 300,
      cell: ({ getValue }) => (
        <div className="truncate" title={getValue() as string}>
          {getValue() as string}
        </div>
      ),
    },
    {
      id: 'category',
      header: () => t('category'),
      accessorKey: 'Category',
      size: 100,
      minSize: 80,
      maxSize: 120,
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs">
          {getValue() as string}
        </Badge>
      ),
    },
    {
      id: 'quantity',
      header: () => t('quantity'),
      accessorKey: 'Quantity',
      size: 80,
      minSize: 60,
      maxSize: 100,
      cell: ({ getValue }) => <div className="text-center">{getValue() as number}</div>,
    },
    {
      id: 'expiry_date',
      header: () => t('expiryDate'),
      accessorKey: 'Expiry_Date',
      size: 180,
      minSize: 160,
      maxSize: 200,
      cell: ({ getValue, row }) => {
        const expiryDate = getValue() as string
        const rowIndex = row.index

        return expiryDate ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={expiryDate}
              onChange={e => updateCsvItemExpiry(rowIndex, e.target.value)}
              className="text-xs h-7 w-[120px]"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value=""
              onChange={e => updateCsvItemExpiry(rowIndex, e.target.value)}
              placeholder="Select date"
              className="text-xs h-7 w-[120px] border-yellow-300 focus:border-yellow-500"
              min={new Date().toISOString().split('T')[0]}
            />
            <span className="text-xs text-yellow-600 whitespace-nowrap">Missing</span>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: data.slice(0, 10), // Show first 10 rows like the original
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: 'onChange',
    enableColumnResizing: false, // Disable resizing for simplicity in CSV preview
    defaultColumn: {
      minSize: 60,
      maxSize: 300,
    },
  })

  return (
    <div className="overflow-x-auto">
      <Table
        style={{
          width: table.getCenterTotalSize(),
          tableLayout: 'fixed',
        }}
      >
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} className="bg-gray-50">
              {headerGroup.headers.map(header => (
                <TableHead
                  key={header.id}
                  className="border border-gray-200 p-2 text-left"
                  style={{
                    width: header.getSize(),
                    minWidth: header.getSize(),
                    maxWidth: header.getSize(),
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map(cell => (
                <TableCell
                  key={cell.id}
                  className="border border-gray-200 p-2"
                  style={{
                    width: cell.column.getSize(),
                    minWidth: cell.column.getSize(),
                    maxWidth: cell.column.getSize(),
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
