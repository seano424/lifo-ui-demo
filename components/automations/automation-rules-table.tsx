'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import {
  useBatchTrackingSetup,
  useSaveBatchTrackingSetup,
} from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
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
            {['Rule', 'Shelf Life', ''].map(h => (
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
              <td className="px-6 py-4" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AutomationRulesTable({ rules, isLoading }: AutomationRulesTableProps) {
  const storeId = useActiveStoreId() || ''
  const { data: batchSetup } = useBatchTrackingSetup(storeId)
  const saveMutation = useSaveBatchTrackingSetup()

  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)

  const totalProducts = rules.reduce((sum, r) => sum + r.products_count, 0)

  // Build the config payload needed by save_batch_tracking_setup RPC.
  // We preserve the existing setup state rather than overwriting it.
  const buildConfig = () => {
    const c = batchSetup?.config
    return {
      enabled: c?.enabled ?? true,
      setup_completed: c?.setup_completed ?? true,
      setup_completed_at: c?.setup_completed_at ?? new Date().toISOString(),
      product_selection_mode: c?.product_selection_mode ?? ('by_category' as const),
      selected_category_ids: c?.selected_category_ids ?? [],
      selected_product_ids: c?.selected_product_ids ?? [],
    }
  }

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule)
    setIsPanelOpen(true)
  }

  const handlePanelClose = () => {
    setIsPanelOpen(false)
  }

  const handleSave = async (rule: AutomationRule, shelfLifeDays: number) => {
    try {
      await saveMutation.mutateAsync({
        storeId,
        config: buildConfig(),
        categorySettings: [
          {
            category_id: rule.rule_id,
            is_tracked: true,
            auto_create_batches: true,
            default_shelf_life_days: shelfLifeDays,
          },
        ],
        productOverrides: [],
      })
      setIsPanelOpen(false)
      toast.success('Rule saved')
    } catch {
      toast.error('Failed to save rule')
    }
  }

  const handleDelete = async (rule: AutomationRule) => {
    try {
      await saveMutation.mutateAsync({
        storeId,
        config: buildConfig(),
        categorySettings: [
          {
            category_id: rule.rule_id,
            is_tracked: true,
            auto_create_batches: false,
            default_shelf_life_days: rule.shelf_life_days,
          },
        ],
        productOverrides: [],
      })
      setIsPanelOpen(false)
      toast.success(`${rule.name} rule deleted`)
    } catch {
      toast.error('Failed to delete rule')
    }
  }

  const handleCreate = async (rule: AutomationRule) => {
    try {
      await saveMutation.mutateAsync({
        storeId,
        config: buildConfig(),
        categorySettings: [
          {
            category_id: rule.rule_id,
            is_tracked: true,
            auto_create_batches: true,
            default_shelf_life_days: rule.shelf_life_days,
          },
        ],
        productOverrides: [],
      })
      setIsAddPanelOpen(false)
      toast.success(`${rule.name} rule created`)
    } catch {
      toast.error('Failed to create rule')
    }
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
            {rules.length}
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
        {rules.length === 0 ? (
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
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rules.map(rule => (
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
        isSaving={saveMutation.isPending}
        onClose={handlePanelClose}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AddAutomationRulePanel
        isOpen={isAddPanelOpen}
        isSaving={saveMutation.isPending}
        onClose={() => setIsAddPanelOpen(false)}
        onCreate={handleCreate}
      />
    </>
  )
}
