import SectionHeader from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'

export default function TodosPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Quick Stats"
          rightContent={<p className="text-sm text-muted-foreground">12 items</p>}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border border-muted rounded-lg p-4">
          <Skeleton className="w-full h-32 bg-muted" />
          <Skeleton className="w-full h-32 bg-muted" />
          <Skeleton className="w-full h-32 bg-muted" />
          <Skeleton className="w-full h-32 bg-muted" />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Urgent Actions"
          rightContent={<p className="text-sm text-muted-foreground">8 items</p>}
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Inventory Suggestions"
          rightContent={<p className="text-sm text-muted-foreground">6 items</p>}
        />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
          <Skeleton className="w-full h-48 aspect-square bg-muted" />
        </div>
      </section>
    </div>
  )
}
