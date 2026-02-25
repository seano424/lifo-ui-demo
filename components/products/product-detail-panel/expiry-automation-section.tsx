'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
          label="Product rule"
          shelfLifeDays={productRule?.shelf_life_days ?? null}
          sublabel="Applies to this product only"
          badge={
            productRule ? (
              <Badge variant="success" size="compact">
                Active
              </Badge>
            ) : null
          }
          dimmed={false}
          onAction={() => openPanel('product')}
          actionLabel={productRule ? 'Edit' : '+ Add'}
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
          label="Category rule"
          shelfLifeDays={categoryRule?.shelf_life_days ?? null}
          sublabel={`Applies to all ${categoryName} products`}
          badge={
            categoryRule && productRule ? (
              <Badge variant="muted" size="compact">
                Overridden
              </Badge>
            ) : categoryRule ? (
              <Badge variant="success" size="compact">
                Active
              </Badge>
            ) : null
          }
          dimmed={!!productRule}
          onAction={() => openPanel('category')}
          actionLabel={categoryRule ? 'Edit' : '+ Add'}
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
  return (
    <div className={cn('flex items-center gap-3', dimmed && 'opacity-50')}>
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Typography variant="p" className="font-semibold">
            {shelfLifeDays !== null ? `${shelfLifeDays}-day shelf life` : 'Not set'}
          </Typography>
          {badge}
        </div>
        <Typography variant="small" color="muted">
          {label} · {sublabel}
        </Typography>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground shrink-0 h-auto py-0 px-1"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  )
}
