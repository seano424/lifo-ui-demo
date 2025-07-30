import SettingsTabs from '@/components/settings/settings-tabs'
import SettingsHeaderDisplay from '@/components/settings/settings-header-display'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="xl:w-[768px] mx-auto space-y-6 w-full py-4">
      <SettingsHeaderDisplay />
      <SettingsTabs />
      <div className="w-full">{children}</div>
    </div>
  )
}
