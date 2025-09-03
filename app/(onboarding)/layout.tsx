export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Optional: Add onboarding-specific header/branding */}
      <div className="container mx-auto">{children}</div>
    </div>
  )
}
