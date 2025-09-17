'use client'

import { TodosCardList } from '@/components/todos/todos-card-list'
import type { TodoFilters } from '@/components/todos/todos-filtered-list'

interface RecentlyExpiredTabProps {
  filters: TodoFilters
}

export function RecentlyExpiredTab({ filters }: RecentlyExpiredTabProps) {
  return (
    <div className="p-4">
      <TodosCardList tab="recently_expired" filters={filters} />
    </div>
  )
}
