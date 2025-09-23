'use client'
import { ContentCard, NextStepsGrid, SupportPageWrapper } from '@/components/support'
import { Package, Users, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'

const getInitialSetupItems = (t: ReturnType<typeof useTranslations<'marketing'>>) => [
  t('steps.initialSetup.items.0'),
  t('steps.initialSetup.items.1'),
  t('steps.initialSetup.items.2'),
  t('steps.initialSetup.items.3'),
]

const getTeamSetupItems = (t: ReturnType<typeof useTranslations<'marketing'>>) => [
  t('steps.teamSetup.items.0'),
  t('steps.teamSetup.items.1'),
  t('steps.teamSetup.items.2'),
  t('steps.teamSetup.items.3'),
]

const getFirstProductsItems = (t: ReturnType<typeof useTranslations<'support'>>) => [
  t('steps.firstProducts.items.0'),
  t('steps.firstProducts.items.1'),
  t('steps.firstProducts.items.2'),
  t('steps.firstProducts.items.3'),
]

const getNextSteps = (t: ReturnType<typeof useTranslations<'marketing'>>) => [
  {
    title: t('nextSteps.items.0.title'),
    description: t('nextSteps.items.0.description'),
    linkText: t('nextSteps.items.0.linkText'),
    linkHref: '/support/scan-in',
  },
  {
    title: t('nextSteps.items.1.title'),
    description: t('nextSteps.items.1.description'),
    linkText: t('nextSteps.items.1.linkText'),
    linkHref: '/support/inventory-management',
  },
]

export default function QuickStartGuidePage() {
  const t = useTranslations('support.quickStartGuide')
  const initialSetupItems = getInitialSetupItems(t)
  const teamSetupItems = getTeamSetupItems(t)
  const firstProductsItems = getFirstProductsItems(t)
  const nextSteps = getNextSteps(t)

  return (
    <SupportPageWrapper
      title={t('title')}
      description={t('description')}
      readTime={t('readTime')}
      intro={t('intro')}
    >
      <div className="space-y-6">
        <ContentCard
          title={t('steps.initialSetup.title')}
          description={t('steps.initialSetup.description')}
          icon={Zap}
          variant="simple"
          simpleItems={initialSetupItems}
        />

        <ContentCard
          title={t('steps.teamSetup.title')}
          description={t('steps.teamSetup.description')}
          icon={Users}
          variant="simple"
          simpleItems={teamSetupItems}
        />

        <ContentCard
          title={t('steps.firstProducts.title')}
          description={t('steps.firstProducts.description')}
          icon={Package}
          variant="simple"
          simpleItems={firstProductsItems}
        />

        <NextStepsGrid title={t('nextSteps.title')} items={nextSteps} />
      </div>
    </SupportPageWrapper>
  )
}
