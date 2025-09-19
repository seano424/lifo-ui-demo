import { Package, Users, Zap } from 'lucide-react'
import { ContentCard, NextStepsGrid, SupportPageWrapper } from '@/components/support'

const initialSetupItems = [
  'Complete your business profile',
  'Set up your first store location',
  'Configure notification preferences',
  'Choose your currency and units',
]

const teamSetupItems = [
  'Invite team members via email',
  'Assign roles and permissions',
  'Set up store access controls',
  'Configure approval workflows',
]

const firstProductsItems = [
  'Scan or manually add product information',
  'Set up product categories',
  'Configure pricing and cost data',
  'Upload product images',
]

const nextSteps = [
  {
    title: 'Scan Your First Batch',
    description: 'Process your first delivery using the scan-in workflow',
    linkText: 'Learn about scan-in →',
    linkHref: '/support/scan-in',
  },
  {
    title: 'Explore Features',
    description: 'Discover advanced inventory management tools',
    linkText: 'View inventory guide →',
    linkHref: '/support/inventory-management',
  },
]

export default function QuickStartGuidePage() {
  return (
    <SupportPageWrapper
      title="Quick Start Guide"
      description="Get up and running with LIFO in just a few simple steps"
      readTime="5 min read"
      intro="Welcome to LIFO! This guide will help you set up your inventory management system and get started with your first products in minutes."
    >
      <div className="space-y-6">
        <ContentCard
          title="Step 1: Initial Setup"
          description="Configure your basic account settings and preferences:"
          icon={Zap}
          variant="simple"
          simpleItems={initialSetupItems}
        />

        <ContentCard
          title="Step 2: Team Setup"
          description="Add team members and configure their access levels:"
          icon={Users}
          variant="simple"
          simpleItems={teamSetupItems}
        />

        <ContentCard
          title="Step 3: Add Your First Products"
          description="Start building your product catalog:"
          icon={Package}
          variant="simple"
          simpleItems={firstProductsItems}
        />

        <NextStepsGrid title="Next Steps" items={nextSteps} />
      </div>
    </SupportPageWrapper>
  )
}
