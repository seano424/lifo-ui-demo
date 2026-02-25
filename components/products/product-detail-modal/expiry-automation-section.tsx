'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { AutomationRulePanel } from '@/components/automations/automation-rule-panel'
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

  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [addingRuleType, setAddingRuleType] = useState<'product' | 'category' | null>(null)

  const productRule = allRules.find(r => r.rule_id === productId && r.type === 'product') ?? null
  const categoryRule = allRules.find(r => r.rule_id === categoryId && r.type === 'category') ?? null
  const effectiveRule = productRule ?? categoryRule

  const handleSave = async (rule: AutomationRule, shelfLifeDays: number) => {
    await saveRule(rule, shelfLifeDays)
    setEditingRule(null)
  }

  const handleDelete = async (rule: AutomationRule) => {
    await deleteRule(rule)
    setEditingRule(null)
  }

  const handleCreate = async (rule: AutomationRule) => {
    await createRule(rule)
    setAddingRuleType(null)
  }

  const handleEdit = () => {
    if (effectiveRule) {
      setEditingRule(effectiveRule)
    } else {
      setAddingRuleType('product')
    }
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
          onClick={handleEdit}
        >
          {effectiveRule ? 'Edit' : '+ Add'}
        </Button>
      </div>

      <AutomationRulePanel
        rule={editingRule}
        isOpen={editingRule !== null}
        isSaving={isPending}
        onClose={() => setEditingRule(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AddAutomationRulePanel
        isOpen={addingRuleType !== null}
        isSaving={isPending}
        onClose={() => setAddingRuleType(null)}
        onCreate={handleCreate}
        initialRuleType={addingRuleType ?? 'category'}
        initialSelectedKey={addingRuleType === 'product' ? productId : categoryId}
        initialProductName={addingRuleType === 'product' ? productName : undefined}
        initialCategoryKey={categoryId}
      />
    </>
  )
}
