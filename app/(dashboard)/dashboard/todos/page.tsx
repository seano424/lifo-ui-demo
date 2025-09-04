import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'

export default function TodosPage() {
  return (
    <div className="flex flex-col gap-6">
      <DashboardInsetHeader
        title="Todos: Suggestions for you"
        description="View and manage your store's todos"
      />
    </div>
  )
}
