import UserAccountInformation from '@/components/account/user-account-information'

export default function AccountSettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <UserAccountInformation />
    </div>
  )
}

// Export metadata for SEO
export const metadata = {
  title: 'Account Settings | LIFO',
  description: 'Manage your personal account information, phone number, and language preferences.',
}
