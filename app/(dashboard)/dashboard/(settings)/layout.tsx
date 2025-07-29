import SettingsHeaderDisplay from '@/components/settings/settings-header-display'
import SettingsTabs from '@/components/settings/settings-tabs'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 lg:mx-auto">
      <SettingsHeaderDisplay />
      <SettingsTabs />
      {children}
    </div>
  )
}
