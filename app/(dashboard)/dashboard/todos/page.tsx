import SectionHeader from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'

export default function TodosPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <SectionHeader
          description="Example: 'Good morning! 3 critical batches, 7 discount opportunities, 12 stable items'"
          title="Daily Summary"
        />
        <div className="flex flex-col gap-4 border border-muted rounded-lg p-4">
          <Skeleton className="w-full h-10 aspect-square bg-muted" />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Expiring Batches"
          description="Expiring in the next 24-48 hours"
          rightContent={<p className="text-sm text-muted-foreground">(2 items) </p>}
        />

        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Recently Expired Batches"
          description="Expired in the last 48 hours"
          rightContent={<p className="text-sm text-muted-foreground">(4 items)</p>}
        />

        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Discount Opportunities"
          description="Example: Greek Yogurt Danone batch 1233: 30% discount could recover €15 (vs €0 if expired)"
          rightContent={<p className="text-sm text-muted-foreground">(6 items)</p>}
        />

        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Donation Candidates"
          description="Example: Fresh Vegetables ready for FoodBank pickup - 2 days until expiry"
          rightContent={<p className="text-sm text-muted-foreground">(6 items)</p>}
        />

        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
      </section>
      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Action History"
          description="Your actions history at a glance. Click for a monthly report."
          rightContent={<p className="text-sm text-muted-foreground">(6 items)</p>}
        />

        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
        <Skeleton className="w-full h-10 aspect-square bg-muted" />
      </section>
    </div>
  )
}
