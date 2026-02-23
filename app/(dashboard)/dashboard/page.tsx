import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { SquareSuccessModal } from '@/components/modals/square-success-modal'
import { SquareSetupModal } from '@/components/dashboard/setting-up-flow/square-setup-modal'

export default function DashboardPage() {
  return (
    <>
      <div className="container py-6 lg:py-8">
        <DashboardContent />
      </div>
      <SquareSuccessModal />
      <SquareSetupModal />
    </>
  )
}
