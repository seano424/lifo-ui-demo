import SettingsTabs from '@/components/settings/settings-tabs'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="xl:w-[768px] mx-auto space-y-6 w-full">
      <DashboardInsetHeader
        title="Settings"
        description="Manage your account & store settings"
        className="py-4"
      />
      <SettingsTabs />
      <div className="w-full">{children}</div>
    </div>
  )
}
