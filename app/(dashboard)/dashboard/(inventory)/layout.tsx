export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="w-full">{children}</div>
    </div>
  )
}
