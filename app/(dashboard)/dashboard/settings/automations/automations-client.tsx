'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useSaveBatchTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'
import { useActiveStoreId } from '@/lib/stores/store-context'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { CategoryRulesSection } from '@/components/automations/category-rules-section'
import { ProductRulesSection } from '@/components/automations/product-rules-section'
import { RulesSaveFooter } from '@/components/automations/shared/rules-save-footer'
import type { CategoryRulesSectionHandle } from '@/components/automations/category-rules-section'
import type { ProductRulesSectionHandle } from '@/components/automations/product-rules-section'

export default function AutomationsClient() {
  const storeId = useActiveStoreId()
  const saveMutation = useSaveBatchTrackingSetup()
  const [isSaving, setIsSaving] = useState(false)

  const categoryRef = useRef<CategoryRulesSectionHandle>(null)
  const productRef = useRef<ProductRulesSectionHandle>(null)

  const handleSave = async () => {
    if (!storeId) return
    setIsSaving(true)
    try {
      const categorySettings = categoryRef.current?.getCategorySettings() ?? []
      const selectedCategoryIds = categoryRef.current?.getSelectedCategoryIds() ?? []
      const productOverrides = productRef.current?.getProductOverrides() ?? []

      await saveMutation.mutateAsync({
        storeId,
        config: {
          enabled: true,
          setup_completed: true,
          setup_completed_at: new Date().toISOString(),
          product_selection_mode: 'by_category',
          selected_category_ids: selectedCategoryIds,
          selected_product_ids: [],
        },
        categorySettings,
        productOverrides,
      })

      toast.success('Automation rules saved')
    } catch {
      toast.error('Failed to save automation rules')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-10 pb-12 container py-8">
      <DashboardInsetHeader
        title="Auto-Track Automations"
        description="Set up rules to automatically calculate expiry dates. When deliveries are logged, Lifo will use these shelf life defaults instead of requiring manual entry."
      />

      <CategoryRulesSection ref={categoryRef} />
      <ProductRulesSection ref={productRef} />

      <RulesSaveFooter
        onSave={handleSave}
        isSaving={isSaving}
        disabled={!storeId}
        label="Save All Rules"
        helperText="Changes apply to new deliveries only — existing batches are not affected."
      />
    </div>
  )
}
