'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { AutomationRulePanel } from '@/components/automations/automation-rule-panel'
import { AddAutomationRulePanel } from '@/components/automations/add-automation-rule-panel'
import { useAutomationRules } from '@/hooks/use-dashboard-redesign'
import { useAutomationRuleMutations } from '@/hooks/use-automation-rule-mutations'
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

  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [addingRuleType, setAddingRuleType] = useState<'product' | 'category' | null>(null)

  const productRule = allRules.find(r => r.rule_id === productId && r.type === 'product') ?? null
  const categoryRule = allRules.find(r => r.rule_id === categoryId && r.type === 'category') ?? null

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

  return (
    <>
      <div className="flex flex-col gap-4">
        <Typography variant="h5" className="font-semibold">
          Expiry automation
        </Typography>

        {/* Product rule */}
        <div className="flex flex-col gap-1.5">
          <Typography variant="small" color="muted">
            Product rule
          </Typography>
          <div className="flex items-center justify-between">
            {productRule ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0 bg-green-500" />
                <Typography variant="p" color="muted">
                  {productRule.shelf_life_days} days · {productName}
                </Typography>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0 bg-border" />
                <Typography variant="p" color="muted">
                  No rule
                </Typography>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-auto py-0 px-1 shrink-0',
                productRule ? 'text-primary' : 'text-muted-foreground',
              )}
              onClick={() =>
                productRule ? setEditingRule(productRule) : setAddingRuleType('product')
              }
            >
              {productRule ? 'Edit →' : '+ Add rule'}
            </Button>
          </div>
        </div>

        {/* Category rule */}
        <div className="flex flex-col gap-1.5">
          <Typography variant="small" color="muted">
            Category rule
          </Typography>
          <div className="flex items-center justify-between">
            {categoryRule ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
                <Typography variant="p" color="muted">
                  {categoryRule.shelf_life_days} days · {categoryName}
                </Typography>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0 bg-border" />
                <Typography variant="p" color="muted">
                  No rule
                </Typography>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-auto py-0 px-1 shrink-0',
                categoryRule ? 'text-primary' : 'text-muted-foreground',
              )}
              onClick={() =>
                categoryRule ? setEditingRule(categoryRule) : setAddingRuleType('category')
              }
            >
              {categoryRule ? 'Edit →' : '+ Add rule'}
            </Button>
          </div>
        </div>
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
      />
    </>
  )
}
