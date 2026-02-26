/**
 * Lifo Features Page - Low-Fidelity Wireframe
 *
 * Layout philosophy:
 * - Mobile-first with max-w-4xl content container
 * - Consistent vertical rhythm (py-16 for sections, space-y-6 for content)
 * - Clear visual hierarchy through font sizes and weights
 * - Gray placeholder blocks for images/screenshots
 */

// ════════════════════════════════════════════════════════════════
// SECTION 1: HERO
// Layout: Centered text stack with single CTA
// Mobile: Full-width, stacked vertically
// ════════════════════════════════════════════════════════════════

function HeroSection() {
  return (
    <section className="py-16 px-6 border-b border-gray-200">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        {/* Headline - largest text on page */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          The expiration layer Square doesn't have
        </h1>

        {/* Subhead - supporting context, lighter weight */}
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Square tracks what you have. Lifo tracks when it expires. Connect your
          account, set your shelf lives, and see exactly which products need
          action — down to the batch.
        </p>

        {/* Primary CTA - prominent, full-width on mobile */}
        <div className="pt-4">
          <button className="w-full sm:w-auto px-8 py-3 bg-gray-900 text-white font-medium rounded-lg">
            Connect Square (free pilot)
          </button>
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// SECTION 2: THE PROBLEM
// Layout: Header + comparison table
// Mobile: Table scrolls horizontally or stacks
// ════════════════════════════════════════════════════════════════

function ProblemSection() {
  const comparisons = [
    {
      square: '"50 units of organic milk"',
      lifo: '"20 expire in 2 days, 15 next week, 15 in 3 weeks"',
    },
    {
      square: '"45 loaves of bread"',
      lifo: '"8 loaves expire tomorrow — discount those, not the rest"',
    },
    {
      square: '"Inventory value: €2,400"',
      lifo: '"€340 at risk this week if you don\'t act"',
    },
  ]

  return (
    <section className="py-16 px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Section header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Aggregate inventory is a guessing game
          </h2>
        </div>

        {/* Comparison table - cards on mobile, table on desktop */}
        <div className="space-y-4">
          {comparisons.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
            >
              {/* Square column - what they currently see */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  What Square shows
                </span>
                <p className="mt-2 text-gray-600">{row.square}</p>
              </div>

              {/* Lifo column - what they need */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  What you need to know
                </span>
                <p className="mt-2 text-gray-900 font-medium">{row.lifo}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Closing statement */}
        <p className="text-center text-gray-600 max-w-2xl mx-auto">
          Lifo adds the expiration dimension to your existing Square data. No
          duplicate entry. No new hardware. Just the visibility you've been
          missing.
        </p>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// SECTION 3: HOW IT WORKS
// Layout: 3-step horizontal on desktop, vertical on mobile
// Each step: number + title + description
// ════════════════════════════════════════════════════════════════

function HowItWorksSection() {
  const steps = [
    {
      number: '1',
      title: 'Connect Square',
      description:
        'One-click OAuth. Your products, categories, and sales data sync automatically. Nothing to upload.',
    },
    {
      number: '2',
      title: 'Set your shelf lives',
      description:
        'Tell us once: "Dairy lasts 14 days. Bakery lasts 3." We\'ll remember for every delivery.',
    },
    {
      number: '3',
      title: "See what\'s expiring",
      description:
        "Your dashboard shows inventory by batch — what's moving, what's stuck, and what needs action today.",
    },
  ]

  return (
    <section className="py-16 px-6 border-b border-gray-200">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Section header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Up and running in 2 minutes
          </h2>
        </div>

        {/* Steps grid - vertical on mobile, horizontal on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div
              key={step.number}
              className="space-y-3"
            >
              {/* Step number - large, muted */}
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-600">
                  {step.number}
                </span>
              </div>

              {/* Step title */}
              <h3 className="text-lg font-semibold text-gray-900">
                {step.title}
              </h3>

              {/* Step description */}
              <p className="text-gray-600 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// SECTION 4: FEATURES
// Layout: Grouped features in cards
// 3 feature groups, each with bullet points
// ════════════════════════════════════════════════════════════════

function FeaturesSection() {
  const featureGroups = [
    {
      title: 'Batch-Level Visibility',
      subtitle: 'See inventory by expiration date, not just by SKU',
      features: [
        {
          name: 'Batch tracking',
          desc: 'Group units by when they expire, not just what they are',
        },
        {
          name: 'FIFO intelligence',
          desc: 'We pull Square sales data and calculate which batches are selling',
        },
        {
          name: 'Value at risk',
          desc: 'See exactly how much money is tied up in expiring stock',
        },
        {
          name: 'Coverage metric',
          desc: 'Track what % of your catalog has expiry dates attached',
        },
      ],
    },
    {
      title: 'Smart Automation',
      subtitle: 'Less data entry, more accuracy',
      features: [
        {
          name: 'Category rules',
          desc: '"All Dairy gets a 14-day shelf life"',
        },
        {
          name: 'Product overrides',
          desc: '"Fresh Bread 400g always gets 3 days"',
        },
        {
          name: 'Auto-batch creation',
          desc: 'Log a delivery, batches create themselves',
        },
        {
          name: 'Set once, track forever',
          desc: 'Your rules persist across every future delivery',
        },
      ],
    },
    {
      title: 'Square Integration',
      subtitle: 'Works with what you already use',
      features: [
        {
          name: 'Automatic catalog sync',
          desc: 'Products and categories pull from Square',
        },
        {
          name: 'Sales data ingestion',
          desc: 'We use your Square transactions for FIFO tracking',
        },
        {
          name: 'No double entry',
          desc: 'Your Square catalog is your product database',
        },
        {
          name: 'Real-time updates',
          desc: 'Changes in Square reflect in Lifo',
        },
      ],
    },
  ]

  return (
    <section className="py-16 px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Section header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Features</h2>
        </div>

        {/* Feature groups - stack vertically */}
        <div className="space-y-8">
          {featureGroups.map((group, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
            >
              {/* Group header */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {group.title}
                </h3>
                <p className="text-sm text-gray-500">{group.subtitle}</p>
              </div>

              {/* Feature list - 2 columns on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.features.map((feature, j) => (
                  <div
                    key={j}
                    className="space-y-1"
                  >
                    <p className="font-medium text-gray-800 text-sm">
                      {feature.name}
                    </p>
                    <p className="text-gray-500 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// SECTION 5: DASHBOARD PREVIEW
// Layout: Header + screenshot placeholder with callout annotations
// Placeholder box represents actual dashboard screenshot
// ════════════════════════════════════════════════════════════════

function DashboardSection() {
  const callouts = [
    {
      label: 'Expiring This Week',
      desc: 'Not a guess. A count, with units and value.',
    },
    {
      label: 'Expiring Soon table',
      desc: 'Specific batches, specific dates, specific actions.',
    },
    {
      label: 'Coverage',
      desc: 'How much of your catalog is tracked? Watch it climb.',
    },
    {
      label: 'Automation rules',
      desc: 'Your shelf life settings, all in one place.',
    },
  ]

  return (
    <section className="py-16 px-6 border-b border-gray-200">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Section header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">
            Finally, inventory that tells you what to do
          </h2>
        </div>

        {/* Screenshot placeholder - gray box representing dashboard */}
        <div className="bg-gray-200 border-2 border-dashed border-gray-300 rounded-xl aspect-video flex items-center justify-center">
          <span className="text-gray-500 font-medium">
            [Dashboard Screenshot]
          </span>
        </div>

        {/* Callout annotations - grid below screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {callouts.map((callout, i) => (
            <div
              key={i}
              className="flex gap-3"
            >
              {/* Number indicator */}
              <div className="w-6 h-6 rounded-full bg-gray-300 shrink-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-600">{i + 1}</span>
              </div>

              {/* Callout text */}
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {callout.label}
                </p>
                <p className="text-gray-500 text-sm">{callout.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// SECTION 6: WHO IT'S FOR
// Layout: Simple centered text with bullet list
// ════════════════════════════════════════════════════════════════

function AudienceSection() {
  const audiences = [
    'Grocery and convenience stores',
    'Specialty food shops',
    'Bakeries and delis',
    'Any retailer tracking expiration dates manually (or not at all)',
  ]

  return (
    <section className="py-16 px-6 bg-gray-50 border-b border-gray-200">
      <div className="max-w-3xl mx-auto space-y-6 text-center">
        {/* Section header */}
        <h2 className="text-2xl font-bold text-gray-900">
          Built for Square retailers who sell perishables
        </h2>

        {/* Audience list - centered, simple */}
        <ul className="space-y-2">
          {audiences.map((item, i) => (
            <li
              key={i}
              className="text-gray-600"
            >
              {item}
            </li>
          ))}
        </ul>

        {/* Note */}
        <p className="text-sm text-gray-500 pt-4">
          Currently available for Square POS users. More integrations coming.
        </p>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// SECTION 7: WHAT WE DON'T DO
// Layout: Honest scope section - builds trust
// Simple list format
// ════════════════════════════════════════════════════════════════

function ScopeSection() {
  const limitations = [
    { title: 'Not a POS', desc: 'Square handles sales. We handle expiration.' },
    {
      title: 'No barcode scanning',
      desc: 'We work from your existing Square catalog.',
    },
    {
      title: 'No consumer marketplace',
      desc: 'This is B2B inventory intelligence, not a discount app.',
    },
    {
      title: 'Single-store focus (for now)',
      desc: 'Multi-store management is on the roadmap.',
    },
  ]

  return (
    <section className="py-16 px-6 border-b border-gray-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Section header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">What Lifo isn't</h2>
          <p className="text-gray-500">Being upfront about our scope</p>
        </div>

        {/* Limitations list */}
        <div className="space-y-4">
          {limitations.map((item, i) => (
            <div
              key={i}
              className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg"
            >
              {/* X indicator - shows this is NOT included */}
              <div className="w-6 h-6 rounded bg-gray-200 shrink-0 flex items-center justify-center">
                <span className="text-gray-500 text-xs font-bold">✕</span>
              </div>

              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// SECTION 8: PRICING / CTA
// Layout: Simple centered CTA section
// Placeholder pricing - emphasizes pilot program
// ════════════════════════════════════════════════════════════════

function PricingSection() {
  return (
    <section className="py-20 px-6 bg-gray-900">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        {/* Header */}
        <h2 className="text-2xl font-bold text-white">
          Simple pricing for pilot users
        </h2>

        {/* Description */}
        <p className="text-gray-400 max-w-xl mx-auto">
          We're onboarding our first stores now. Pilot pricing available for
          early adopters willing to give feedback.
        </p>

        {/* CTA */}
        <div className="pt-4">
          <button className="w-full sm:w-auto px-8 py-3 bg-white text-gray-900 font-medium rounded-lg">
            Join the pilot →
          </button>
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// Composes all sections in order
// ════════════════════════════════════════════════════════════════

export default function LifoFeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header placeholder */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="font-bold text-gray-900">Lifo</span>
          <nav className="hidden sm:flex gap-6 text-sm text-gray-600">
            <span>Features</span>
            <span>Pricing</span>
            <span>Login</span>
          </nav>
          <button className="sm:hidden w-6 h-6 bg-gray-200 rounded" />
        </div>
      </header>

      {/* Page sections */}
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <DashboardSection />
        <AudienceSection />
        <ScopeSection />
        <PricingSection />
      </main>

      {/* Simple footer placeholder */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
          © 2025 Lifo · Privacy · Terms
        </div>
      </footer>
    </div>
  )
}
