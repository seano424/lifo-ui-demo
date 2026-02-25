'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { AddAutomationRulePanel } from '@/components/automations/add-automation-rule-panel'
import { useAutomationRules } from '@/hooks/use-dashboard-redesign'
import { useAutomationRuleMutations } from '@/hooks/use-automation-rule-mutations'
import { RefreshCw } from 'lucide-react'
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

  const productRule = allRules.find(r => r.rule_id === productId && r.type === 'product') ?? null
  const categoryRule = allRules.find(r => r.rule_id === categoryId && r.type === 'category') ?? null
  const effectiveRule = productRule ?? categoryRule

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
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <RefreshCw className="size-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <Typography variant="p" className="font-semibold">
            {effectiveRule ? `${effectiveRule.shelf_life_days}-day shelf life` : 'No rule set'}
          </Typography>
          <Typography variant="small" color="muted">
            {effectiveRule
              ? 'Applied to new stock automatically'
              : 'Add a rule to automate expiry tracking'}
          </Typography>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground shrink-0 h-auto py-0 px-1"
          onClick={() => setPanelOpen(true)}
        >
          {effectiveRule ? 'Edit' : '+ Add'}
        </Button>
      </div>

      <AddAutomationRulePanel
        isOpen={panelOpen}
        isSaving={isPending}
        onClose={handleClose}
        onCreate={handleCreate}
        onSave={handleSave}
        onDelete={handleDelete}
        // Pass both rules so the panel manages per-tab create/edit state
        productRule={productRule}
        categoryRule={categoryRule}
        // Open on the effective rule's tab, falling back to product
        initialRuleType={effectiveRule?.type ?? 'product'}
        initialSelectedKey={productId}
        initialProductName={productName}
        initialCategoryKey={categoryId}
      />
    </>
  )
}
