'use client'

import { useState } from 'react'
import { Settings, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAutomationRules } from '@/hooks/use-dashboard-redesign'
import { useAutomationRuleMutations } from '@/hooks/use-automation-rule-mutations'
import { useCreateInitialBatches } from '@/hooks/use-square-integration'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '../ui/typography'
import { Badge } from '../ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AutomationRulePanel } from '@/components/automations/automation-rule-panel'
import { AddAutomationRulePanel } from '@/components/automations/add-automation-rule-panel'
import type { AutomationRule } from '@/lib/queries/dashboard'
import { cn } from '@/lib/utils'

export function AutomationCard({ showLinks = true }: { showLinks?: boolean }) {
  const t = useTranslations('dashboard.redesign.automation')
  const storeId = useActiveStoreId()
  const { data: rules, isLoading } = useAutomationRules()

  const [showInitialBatchPrompt, setShowInitialBatchPrompt] = useState(false)
  const { saveRule, deleteRule, createRule, isPending } = useAutomationRuleMutations({
    onSaveSuccess: () => setShowInitialBatchPrompt(true),
  })
  const createInitialBatches = useCreateInitialBatches()

  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)

  const handleSave = async (rule: AutomationRule, shelfLifeDays: number) => {
    try {
      await saveRule(rule, shelfLifeDays)
      setIsPanelOpen(false)
    } catch {
      // error toast shown inside hook
    }
  }

  const handleDelete = async (rule: AutomationRule) => {
    try {
      await deleteRule(rule)
      setIsPanelOpen(false)
    } catch {
      // error toast shown inside hook
    }
  }

  const handleCreate = async (rule: AutomationRule) => {
    try {
      await createRule(rule)
      setIsAddPanelOpen(false)
    } catch {
      // error toast shown inside hook
    }
  }

  const handleConfirmInitialBatches = () => {
    if (storeId) createInitialBatches.mutate({ storeId })
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-muted px-6 py-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1 h-3 w-32" />
        </div>
        <div className="px-6 py-4">
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    )
  }

  const totalProducts = rules?.reduce((sum, r) => sum + r.products_count, 0) || 0
  const hasRules = rules && rules.length > 0

  return (
    <>
      {/* Empty state - no automation rules configured */}
      {!hasRules && (
        <Card className="p-6 bg-card/0">
          <div className="flex flex-col items-center text-center">
            <Settings className="mb-3 h-12 w-12 text-gray-300" aria-hidden="true" />
            <Typography variant="h4">{t('emptyState.title')}</Typography>
            <Typography variant="p" color="muted">
              {t('emptyState.description')}
            </Typography>

            <button
              type="button"
              onClick={() => setIsAddPanelOpen(true)}
              className="transition-colors hover:text-gray-900 mt-4"
            >
              {t('addRule')}
            </button>
          </div>
        </Card>
      )}

      {/* Active state - show rules summary and list */}
      {hasRules && (
        <Card className="overflow-hidden flex flex-col gap-0 bg-card/0">
          {showLinks && (
            <div className="flex flex-col-reverse gap-4 sm:flex-row items-start justify-between py-4">
              <div className="flex flex-col gap-2">
                <Typography variant="h4">{t('title')}</Typography>
                <Typography variant="p" color="muted" className="max-w-md">
                  {t('subtitle')}
                </Typography>
              </div>

              <Link href="/dashboard/settings/automations">
                <Typography
                  variant="p"
                  color="muted"
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-secondary-100"
                >
                  {t('manage')}
                  <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                </Typography>
              </Link>
            </div>
          )}

          {/* Summary Stats Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-muted pb-4">
            <div className="flex gap-2 items-center">
              <Typography
                className="border aspect-square min-h-10 min-w-10 p-2 flex items-center justify-center rounded-full dark:border-secondary-100"
                variant="p"
              >
                {rules?.length ?? 0}
              </Typography>
              <Typography variant="p">{t('activeRules')}</Typography>
            </div>
            <div className="h-8 w-px bg-muted hidden sm:block" />
            <div className="flex gap-2 items-center">
              <Typography
                className="border aspect-square min-h-10 min-w-10 p-2 flex items-center justify-center rounded-full dark:border-secondary-100"
                variant="p"
              >
                {totalProducts}
              </Typography>
              <Typography variant="p">{t('productsCovered')}</Typography>
            </div>
          </div>

          {/* Rules List */}
          <div className="divide-y divide-muted py-2">
            {rules.map(rule => (
              <button
                key={rule.rule_id}
                type="button"
                onClick={() => {
                  setEditingRule(rule)
                  setIsPanelOpen(true)
                }}
                className="flex sm:items-center justify-between py-3 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-secondary-900/10 dark:hover:text-secondary-100 cursor-pointer w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full hidden sm:block',
                      rule.type === 'product' ? 'bg-green-500' : 'bg-primary',
                    )}
                  />
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between sm:divide-x sm:divide-muted">
                    <Typography variant="p" color="default" className="sm:pr-2">
                      {rule.name}
                    </Typography>
                    <Typography variant="small" color="muted">
                      {t(`ruleTypes.${rule.type}`)} · {rule.products_count} items ·{' '}
                      {rule.shelf_life_days != null ? `${rule.shelf_life_days}d` : '—'}
                    </Typography>
                  </div>
                </div>
                <Badge
                  variant={rule.type === 'product' ? 'success' : 'primary'}
                  className="size-9 sm:size-auto rounded text-xs sm:text-sm"
                >
                  {rule.shelf_life_days != null ? `${rule.shelf_life_days}d` : '—'}
                </Badge>
              </button>
            ))}
          </div>

          {/* Footer */}
          <Typography variant="p">
            <button
              type="button"
              onClick={() => setIsAddPanelOpen(true)}
              className="flex items-center gap-2 hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-secondary-900/10 dark:hover:text-secondary-100 py-5 border-t border-muted w-full text-left"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('addRule')}
            </button>
          </Typography>
        </Card>
      )}

      <AutomationRulePanel
        rule={editingRule}
        isOpen={isPanelOpen}
        isSaving={isPending}
        onClose={() => setIsPanelOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AddAutomationRulePanel
        isOpen={isAddPanelOpen}
        isSaving={isPending}
        onClose={() => setIsAddPanelOpen(false)}
        onCreate={handleCreate}
      />

      <InitialBatchPrompt
        open={showInitialBatchPrompt}
        onOpenChange={setShowInitialBatchPrompt}
        onConfirm={handleConfirmInitialBatches}
        isPending={createInitialBatches.isPending}
      />
    </>
  )
}

function InitialBatchPrompt({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isPending: boolean
}) {
  const t = useTranslations('dashboard.redesign.automation.initialBatchPrompt')
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
