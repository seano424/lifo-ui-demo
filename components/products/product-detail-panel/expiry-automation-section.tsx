'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Typography } from '@/components/ui/typography'
import { AddAutomationRulePanel } from '@/components/automations/add-automation-rule-panel'
import { useAutomationRules } from '@/hooks/use-dashboard-redesign'
import { useAutomationRuleMutations } from '@/hooks/use-automation-rule-mutations'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AutomationRule } from '@/lib/queries/dashboard'

interface ExpiryAutomationSectionProps {
  productId: string
  productName: string
  categoryId: string
  categoryName: string
}

export function ExpiryAutomationSection({
  productId,
  productName,
  categoryId,
  categoryName,
}: ExpiryAutomationSectionProps) {
  const t = useTranslations('products.detailPanel.expiryAutomation')
  const { data: allRules = [] } = useAutomationRules()
  const { saveRule, deleteRule, createRule, isPending } = useAutomationRuleMutations()

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelInitialTab, setPanelInitialTab] = useState<'product' | 'category'>('product')

  const productRule = allRules.find(r => r.rule_id === productId && r.type === 'product') ?? null
  const categoryRule = allRules.find(r => r.rule_id === categoryId && r.type === 'category') ?? null

  const openPanel = (tab: 'product' | 'category') => {
    setPanelInitialTab(tab)
    setPanelOpen(true)
  }

  const handleClose = () => setPanelOpen(false)

  const handleSave = async (rule: AutomationRule, shelfLifeDays: number) => {
    await saveRule(rule, shelfLifeDays)
    handleClose()
  }

  const handleDelete = async (rule: AutomationRule) => {
    await deleteRule(rule)
    handleClose()
  }

  const handleCreate = async (rule: AutomationRule) => {
    await createRule(rule)
    handleClose()
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Product rule row — always takes precedence */}
        <RuleRow
          icon={
            <RefreshCw
              className={cn('size-4', productRule ? 'text-foreground' : 'text-muted-foreground')}
            />
          }
          label={t('productRule.label')}
          shelfLifeDays={productRule?.shelf_life_days ?? null}
          sublabel={t('productRule.sublabel')}
          badge={
            productRule ? (
              <Badge variant="success" size="compact">
                {t('status.active')}
              </Badge>
            ) : null
          }
          dimmed={false}
          onAction={() => openPanel('product')}
          actionLabel={productRule ? t('actions.edit') : t('actions.add')}
        />

        {/* Category rule row — active only when no product rule overrides it */}
        <RuleRow
          icon={
            <RefreshCw
              className={cn(
                'size-4',
                categoryRule && !productRule ? 'text-foreground' : 'text-muted-foreground',
              )}
            />
          }
          label={t('categoryRule.label')}
          shelfLifeDays={categoryRule?.shelf_life_days ?? null}
          sublabel={t('categoryRule.sublabel', { category: categoryName })}
          badge={
            categoryRule && productRule ? (
              <Badge variant="muted" size="compact">
                {t('status.overridden')}
              </Badge>
            ) : categoryRule ? (
              <Badge variant="success" size="compact">
                {t('status.active')}
              </Badge>
            ) : null
          }
          dimmed={!!productRule}
          onAction={() => openPanel('category')}
          actionLabel={categoryRule ? t('actions.edit') : t('actions.add')}
        />
      </div>

      <AddAutomationRulePanel
        isOpen={panelOpen}
        isSaving={isPending}
        onClose={handleClose}
        onCreate={handleCreate}
        onSave={handleSave}
        onDelete={handleDelete}
        productRule={productRule}
        categoryRule={categoryRule}
        initialRuleType={panelInitialTab}
        initialSelectedKey={productId}
        initialProductName={productName}
        initialCategoryKey={categoryId}
      />
    </>
  )
}

interface RuleRowProps {
  icon: React.ReactNode
  label: string
  shelfLifeDays: number | null
  sublabel: string
  badge: React.ReactNode
  dimmed: boolean
  onAction: () => void
  actionLabel: string
}

function RuleRow({
  icon,
  label,
  shelfLifeDays,
  sublabel,
  badge,
  dimmed,
  onAction,
  actionLabel,
}: RuleRowProps) {
  const t = useTranslations('products.detailPanel.expiryAutomation')
  return (
    <button
      type="button"
      className={cn('flex items-center justify-between group gap-3 py-2')}
      onClick={onAction}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 transition-all duration-300 ease-in">
          {icon}
        </div>

        <div className={cn('text-left', (shelfLifeDays === null || dimmed) && 'opacity-50')}>
          <div className="flex items-center gap-2">
            <Typography variant="p">
              {shelfLifeDays !== null
                ? t('shelfLife.days', { count: shelfLifeDays })
                : t('shelfLife.notAvailable')}
            </Typography>
            {badge}
          </div>

          <Typography variant="small" color="muted">
            {label} · {sublabel}
          </Typography>
        </div>
      </div>

      <Typography
        variant="small"
        className="text-muted-foreground sm:text-muted-foreground/0 group-hover:text-foreground shrink-0 h-auto py-0 px-1 transition-all duration-100 ease-in-out"
      >
        {actionLabel}
      </Typography>
    </button>
  )
}
