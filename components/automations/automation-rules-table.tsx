'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { AutomationRuleRow } from './automation-rule-row'
import { AutomationRulePanel } from './automation-rule-panel'
import { AddAutomationRulePanel } from './add-automation-rule-panel'
import type { AutomationRule } from '@/lib/queries/dashboard'

interface AutomationRulesTableProps {
  rules: AutomationRule[]
  isLoading: boolean
}

function TableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {['Rule', 'Shelf Life', 'Created', ''].map(h => (
              <th key={h} className="px-6 py-3 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {[1, 2, 3].map(i => (
            <tr key={i}>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-2 h-2 rounded-full shrink-0" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-16" />
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="px-6 py-4" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AutomationRulesTable({ rules, isLoading }: AutomationRulesTableProps) {
  const [localRules, setLocalRules] = useState<AutomationRule[] | null>(null)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)

  // Use local overrides if the user has made edits, otherwise show server data
  const displayRules = localRules ?? rules

  const activeRules = displayRules.filter(r => r.status === 'active')
  const totalProducts = displayRules.reduce((sum, r) => sum + r.products_count, 0)

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule)
    setIsPanelOpen(true)
  }

  const handlePanelClose = () => {
    setIsPanelOpen(false)
  }

  const handleSave = (rule: AutomationRule, shelfLifeDays: number) => {
    setLocalRules(
      (localRules ?? rules).map(r =>
        r.rule_id === rule.rule_id ? { ...r, shelf_life_days: shelfLifeDays } : r,
      ),
    )
    setIsPanelOpen(false)
    toast.success('Rule saved')
  }

  const handleDelete = (rule: AutomationRule) => {
    setLocalRules((localRules ?? rules).filter(r => r.rule_id !== rule.rule_id))
    setIsPanelOpen(false)
    toast.success(`${rule.name} rule deleted`)
  }

  const handleCreate = (draft: Omit<AutomationRule, 'rule_id' | 'created_at'>) => {
    const newRule: AutomationRule = {
      ...draft,
      rule_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    setLocalRules([...(localRules ?? rules), newRule])
    setIsAddPanelOpen(false)
    toast.success(`${newRule.name} rule created`)
  }

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <>
      {/* Stat pills */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
          <Typography variant="p" className="text-2xl font-semibold text-foreground leading-none">
            {activeRules.length}
          </Typography>
          <Typography variant="small" color="muted">
            Active rules
          </Typography>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
          <Typography variant="p" className="text-2xl font-semibold text-foreground leading-none">
            {totalProducts}
          </Typography>
          <Typography variant="small" color="muted">
            Products covered
          </Typography>
        </div>
        <div className="ml-auto">
          <Button variant="default" size="sm" onClick={() => setIsAddPanelOpen(true)}>
            <Plus className="w-4 h-4" />
            Add rule
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {displayRules.length === 0 ? (
          <div className="py-16 text-center">
            <Typography variant="p" color="muted">
              No automation rules yet. Add a rule to get started.
            </Typography>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Shelf Life
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayRules.map(rule => (
                <AutomationRuleRow
                  key={rule.rule_id}
                  rule={rule}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AutomationRulePanel
        rule={editingRule}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AddAutomationRulePanel
        isOpen={isAddPanelOpen}
        onClose={() => setIsAddPanelOpen(false)}
        onCreate={handleCreate}
      />
    </>
  )
}
