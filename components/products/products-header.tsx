'use client'

import { Download, Plus } from 'lucide-react'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'

export default function ProductsHeader({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <DashboardInsetHeader
      title={title}
      description={description}
      rightContent={
        <div className="flex gap-2">
          <Button onClick={() => alert('Todo: Export products')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => alert('Todo: Add product')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      }
    />
  )
}
