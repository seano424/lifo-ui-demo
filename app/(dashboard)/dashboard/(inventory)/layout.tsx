import InventoryHeader from '@/components/inventory/inventory-header'

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <InventoryHeader />
      <div className="w-full">{children}</div>
    </div>
  )
}
