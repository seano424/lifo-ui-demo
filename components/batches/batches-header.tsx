'use client'

import { Download, Plus } from 'lucide-react'
import Link from 'next/link'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'

export default function BatchesHeader({
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
          <Button onClick={() => alert('Todo: Export batches')} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Link href="/dashboard/inbound">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Batch
            </Button>
          </Link>
        </div>
      }
    />
  )
}
