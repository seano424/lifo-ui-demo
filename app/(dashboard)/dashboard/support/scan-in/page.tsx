'use client'
import { ContentCard, SupportPageWrapper } from '@/components/support'
import { AlertTriangle, Camera, Package, ScanLine } from 'lucide-react'
import { useTranslations } from 'next-intl'

const getScanInSteps = (t: ReturnType<typeof useTranslations<'marketing'>>) => [
  {
    number: 1,
    description: t('basicSteps.steps.0.description'),
  },
  {
    number: 2,
    description: t('basicSteps.steps.1.description'),
  },
  {
    number: 3,
    description: t('basicSteps.steps.2.description'),
  },
  {
    number: 4,
    description: t('basicSteps.steps.3.description'),
  },
  {
    number: 5,
    description: t('basicSteps.steps.4.description'),
  },
]

const getNewProductFeatures = (t: ReturnType<typeof useTranslations<'marketing'>>) => [
  {
    problem: t('newProducts.items.0.problem'),
    solution: t('newProducts.items.0.solution'),
  },
  {
    problem: t('newProducts.items.1.problem'),
    solution: t('newProducts.items.1.solution'),
  },
  {
    problem: t('newProducts.items.2.problem'),
    solution: t('newProducts.items.2.solution'),
  },
  {
    problem: t('newProducts.items.3.problem'),
    solution: t('newProducts.items.3.solution'),
  },
]

const getTroubleshootingItems = (t: ReturnType<typeof useTranslations<'marketing'>>) => [
  {
    problem: t('troubleshooting.items.0.problem'),
    solution: t('troubleshooting.items.0.solution'),
  },
  {
    problem: t('troubleshooting.items.1.problem'),
    solution: t('troubleshooting.items.1.solution'),
  },
  {
    problem: t('troubleshooting.items.2.problem'),
    solution: t('troubleshooting.items.2.solution'),
  },
  {
    problem: t('troubleshooting.items.3.problem'),
    solution: t('troubleshooting.items.3.solution'),
  },
]

export default function ScanInProcessPage() {
  const t = useTranslations('support.scanInProcess')
  const scanInSteps = getScanInSteps(t)
  const newProductFeatures = getNewProductFeatures(t)
  const troubleshootingItems = getTroubleshootingItems(t)

  return (
    <SupportPageWrapper
      title={t('title')}
      description={t('description')}
      readTime={t('readTime')}
      intro={t('intro')}
    >
      <div className="flex flex-col gap-6">
        <ContentCard
          title={t('basicSteps.title')}
          icon={ScanLine}
          variant="steps"
          steps={scanInSteps}
        />

        <ContentCard
          title={t('newProducts.title')}
          description={t('newProducts.description')}
          icon={Package}
          variant="troubleshooting"
          troubleshootingItems={newProductFeatures}
        />

        <ContentCard
          title={t('imageRecognition.title')}
          description={t('imageRecognition.description')}
          icon={Camera}
          variant="simple"
        />

        <ContentCard
          title={t('troubleshooting.title')}
          icon={AlertTriangle}
          variant="troubleshooting"
          troubleshootingItems={troubleshootingItems}
        />
      </div>
    </SupportPageWrapper>
  )
}
