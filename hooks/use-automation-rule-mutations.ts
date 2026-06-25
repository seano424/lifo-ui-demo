const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useBatchTrackingSetup,
  useSaveBatchTrackingSetup,
} from '@/lib/queries/batch-tracking-onboarding'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import type { AutomationRule } from '@/lib/queries/dashboard'
import type { CategoryWithTrackingSettings } from '@/types/rpc-returns'
import { DEMO_STORE_ID } from '@/lib/mocks/demo-data'

/**
 * Centralises the save/delete/create mutation logic for automation rules.
 *
 * Both AutomationRulesTable (settings page) and AutomationCard (dashboard)
 * share identical RPC call shapes — this hook owns that logic so it only
 * lives in one place.
 *
 * @example
 * const { saveRule, deleteRule, createRule, isPending } = useAutomationRuleMutations()
 *
 * const handleSave = async (rule, days) => {
 *   try {
 *     await saveRule(rule, days)
 *     setIsPanelOpen(false)
 *   } catch {
 *     // error toast already shown inside hook
 *   }
 * }
 */
export function useAutomationRuleMutations({ onSaveSuccess }: { onSaveSuccess?: () => void } = {}) {
  const storeId = useActiveStoreId() || ''
  const { data: batchSetup } = useBatchTrackingSetup(storeId)
  const saveMutation = useSaveBatchTrackingSetup()
  const queryClient = useQueryClient()

  // Preserve existing setup state rather than overwriting it.
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

  const saveRule = async (rule: AutomationRule, shelfLifeDays: number): Promise<void> => {
    if (isDemo) {
      queryClient.setQueryData(
        queryKeys.batchTrackingOnboarding.categories(DEMO_STORE_ID),
        (old: CategoryWithTrackingSettings[] | undefined) =>
          old?.map(cat =>
            cat.category_id === rule.rule_id
              ? { ...cat, default_shelf_life_days: shelfLifeDays, auto_create_batches: true }
              : cat,
          ) ?? old,
      )
      toast.success('Rule saved')
      onSaveSuccess?.()
      return
    }

    try {
      if (rule.type === 'product') {
        await saveMutation.mutateAsync({
          storeId,
          config: buildConfig(),
          categorySettings: [],
          productOverrides: [
            {
              product_id: rule.rule_id,
              shelf_life_override_days: shelfLifeDays,
              auto_create_batches: true,
            },
          ],
        })
      } else {
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
      }
      toast.success('Rule saved')
      onSaveSuccess?.()
    } catch {
      toast.error('Failed to save rule')
      throw new Error('saveRule failed')
    }
  }

  const deleteRule = async (rule: AutomationRule): Promise<void> => {
    if (isDemo) {
      queryClient.setQueryData(
        queryKeys.batchTrackingOnboarding.categories(DEMO_STORE_ID),
        (old: CategoryWithTrackingSettings[] | undefined) =>
          old?.map(cat =>
            cat.category_id === rule.rule_id
              ? { ...cat, auto_create_batches: false, default_shelf_life_days: null }
              : cat,
          ) ?? old,
      )
      toast.success(`${rule.name} rule deleted`)
      return
    }

    try {
      if (rule.type === 'product') {
        await saveMutation.mutateAsync({
          storeId,
          config: buildConfig(),
          categorySettings: [],
          productOverrides: [
            {
              product_id: rule.rule_id,
              shelf_life_override_days: null,
              auto_create_batches: null,
            },
          ],
        })
      } else {
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
      }
      toast.success(`${rule.name} rule deleted`)
    } catch {
      toast.error('Failed to delete rule')
      throw new Error('deleteRule failed')
    }
  }

  const createRule = async (rule: AutomationRule): Promise<void> => {
    if (isDemo) {
      queryClient.setQueryData(
        queryKeys.batchTrackingOnboarding.categories(DEMO_STORE_ID),
        (old: CategoryWithTrackingSettings[] | undefined) =>
          old?.map(cat =>
            cat.category_id === rule.rule_id
              ? {
                  ...cat,
                  auto_create_batches: true,
                  default_shelf_life_days: rule.shelf_life_days,
                }
              : cat,
          ) ?? old,
      )
      toast.success(`${rule.name} rule created`)
      onSaveSuccess?.()
      return
    }

    try {
      if (rule.type === 'product') {
        await saveMutation.mutateAsync({
          storeId,
          config: buildConfig(),
          categorySettings: [],
          productOverrides: [
            {
              product_id: rule.rule_id,
              shelf_life_override_days: rule.shelf_life_days,
              auto_create_batches: true,
            },
          ],
        })
      } else {
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
      }
      toast.success(`${rule.name} rule created`)
      onSaveSuccess?.()
    } catch {
      toast.error('Failed to create rule')
      throw new Error('createRule failed')
    }
  }

  return { saveRule, deleteRule, createRule, isPending: isDemo ? false : saveMutation.isPending }
}
