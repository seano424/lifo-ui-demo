# Batch Creation UI Components

Base UI components for the LIFO batch creation workflow, optimized for mobile-first design with touch-friendly interactions.

## Components

### 1. QuantitySelector

Touch-friendly quantity selector with large +/- buttons.

**Features:**
- Large 44px tap targets for mobile
- Prominent number display
- Min/max constraints with auto-disable
- Active state visual feedback
- Accessible with aria-labels

**Usage:**
```tsx
import { QuantitySelector } from '@/components/batch-creation'

<QuantitySelector
  value={quantity}
  onChange={setQuantity}
  min={1}
  max={100}
  disabled={false}
/>
```

**Props:**
- `value: number` - Current quantity value
- `onChange: (value: number) => void` - Callback when value changes
- `min?: number` - Minimum value (default: 0)
- `max?: number` - Maximum value (default: 999)
- `disabled?: boolean` - Disable all interactions
- `className?: string` - Additional CSS classes

---

### 2. ExpiryPresetButtons

Grid of preset expiry date buttons with custom date picker option.

**Features:**
- 6 common presets: +3d, +7d, +14d, +30d, +60d, +90d
- Custom date picker button
- Highlights suggested days from history
- Shows calculated expiry date
- Visual indicator for suggestions
- 44px minimum tap targets

**Usage:**
```tsx
import { ExpiryPresetButtons } from '@/components/batch-creation'

<ExpiryPresetButtons
  onSelect={(days) => setSelectedDays(days)}
  onPickDate={() => setShowDatePicker(true)}
  selectedDays={7}
  suggestedDays={7} // From product.last_expiry_days
/>
```

**Props:**
- `onSelect: (days: number) => void` - Callback when preset is selected
- `onPickDate: () => void` - Callback to open custom date picker
- `selectedDays?: number | null` - Currently selected days
- `suggestedDays?: number | null` - Suggested days from history (highlights button)
- `className?: string` - Additional CSS classes

---

### 3. DraftBatchCard

Compact card showing a product with draft batches needing expiry dates.

**Features:**
- Product image, name, and brand
- Draft quantity badge
- Category expiry hint
- "Same" quick action if last expiry exists
- "Different..." or "Add Expiry" button
- Optional skip action
- Mobile-optimized layout

**Usage:**
```tsx
import { DraftBatchCard } from '@/components/batch-creation'
import { useDraftBatchesByProduct } from '@/hooks/use-draft-batches'

const { data: products } = useDraftBatchesByProduct()

{products?.map((product) => (
  <DraftBatchCard
    key={product.product_id}
    product={product}
    onAddExpiry={() => openExpiryDialog(product)}
    onSkip={() => skipProduct(product.product_id)}
  />
))}
```

**Props:**
- `product: ProductWithDraftBatches` - Product data from `useDraftBatchesByProduct`
- `onAddExpiry: () => void` - Callback to add expiry date
- `onSkip?: () => void` - Optional callback to skip this product
- `className?: string` - Additional CSS classes

**Product Type:**
```typescript
interface ProductWithDraftBatches {
  product_id: string
  product_name: string
  product_brand: string | null
  category_name: string | null
  typical_shelf_life_days: number | null
  draft_batch_count: number
  total_draft_quantity: number
  draft_batches: DraftBatchItem[]
  last_expiry_days: number | null
  last_batch_expiry_date: string | null
  total_count: number
}
```

---

### 4. BatchSuccessCard

Success feedback card with checkmark animation showing batch activation result.

**Features:**
- Animated checkmark icon
- Success/error states
- Shows activated quantity and expiry date
- Split batch warning (when partial activation)
- Next action buttons
- Pulsing animation effect

**Usage:**
```tsx
import { BatchSuccessCard } from '@/components/batch-creation'
import { useActivateDraftBatch } from '@/hooks/use-draft-batches'

const { mutateAsync: activateBatch } = useActivateDraftBatch()

const result = await activateBatch({
  batchId: 'batch-uuid',
  expiryDate: '2025-02-01',
  quantity: 10
})

{result && (
  <BatchSuccessCard
    result={result}
    onAddAnother={() => setShowForm(true)}
    onSkip={() => goToNextProduct()}
  />
)}
```

**Props:**
- `result: ActivateDraftBatchResult` - Result from `useActivateDraftBatch`
- `onAddAnother?: () => void` - Callback to add another batch
- `onSkip?: () => void` - Callback to skip to next product
- `className?: string` - Additional CSS classes

**Result Type:**
```typescript
interface ActivateDraftBatchResult {
  success: boolean
  activated_batch_id: string
  activated_quantity: number
  expiry_date: string
  was_split: boolean
  remaining_draft_batch_id: string | null
  remaining_draft_quantity: number | null
  message: string
}
```

---

### 5. BatchCreationSheet

Multi-step Sheet modal for LIFO batch creation workflow.

**Features:**
- Step 1: Product selection (list of products with drafts)
- Step 2: Expiry date entry with quantity selector
- Step 3: Success feedback with split batch handling
- Smooth step transitions with animations
- Loading and error states
- Progress tracking (Product X of Y)
- Supports single product or multiple products
- Mobile-optimized with Sheet component

**Usage:**
```tsx
import { BatchCreationSheet } from '@/components/batch-creation'
import { useDraftBatchesByProduct } from '@/hooks/use-draft-batches'

const { data: products } = useDraftBatchesByProduct()

<BatchCreationSheet
  open={isOpen}
  onOpenChange={setIsOpen}
  storeId={storeId}
  products={products}
  onComplete={() => console.log('All done!')}
/>

// Or for a single product:
<BatchCreationSheet
  open={isOpen}
  onOpenChange={setIsOpen}
  storeId={storeId}
  singleProduct={product}
/>
```

**Props:**
- `open: boolean` - Sheet open state
- `onOpenChange: (open: boolean) => void` - State change callback
- `storeId: string` - Store ID for fetching products
- `products?: ProductWithDraftBatches[]` - Optional products list (fetched if not provided)
- `singleProduct?: ProductWithDraftBatches` - Optional single product mode
- `onComplete?: () => void` - Callback when all products processed

**Flow:**
1. **Product Selection** (skipped if singleProduct): Shows list of DraftBatchCard components
2. **Expiry Entry**: Shows product header, quantity selector, expiry presets, and custom date picker
3. **Success**: Shows BatchSuccessCard with options to add another batch or continue to next product

**Step Transitions:**
- Product Selection → Expiry Entry (click product card)
- Expiry Entry → Success (click "Add Batch")
- Success → Expiry Entry (click "Add Another Batch" if split)
- Success → Next Product or Close (click "Continue")
- Expiry Entry → Product Selection (click back button)

---

## Complete Example Workflow

```tsx
'use client'

import { useState } from 'react'
import {
  QuantitySelector,
  ExpiryPresetButtons,
  DraftBatchCard,
  BatchSuccessCard,
} from '@/components/batch-creation'
import {
  useDraftBatchesByProduct,
  useActivateDraftBatch,
} from '@/hooks/use-draft-batches'

export function BatchCreationFlow() {
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [activationResult, setActivationResult] = useState(null)

  const { data: products } = useDraftBatchesByProduct()
  const { mutateAsync: activateBatch } = useActivateDraftBatch()

  const currentProduct = products?.[0]

  const handleActivate = async () => {
    if (!currentProduct || !selectedDays) return

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + selectedDays)

    const result = await activateBatch({
      batchId: currentProduct.draft_batches[0].batch_id,
      expiryDate: expiryDate.toISOString().split('T')[0],
      quantity: selectedQuantity,
    })

    setActivationResult(result)
  }

  if (activationResult) {
    return (
      <BatchSuccessCard
        result={activationResult}
        onAddAnother={() => setActivationResult(null)}
        onSkip={() => {/* Go to next product */}}
      />
    )
  }

  if (!currentProduct) {
    return <div>No draft batches to process</div>
  }

  return (
    <div className="space-y-6">
      <DraftBatchCard
        product={currentProduct}
        onAddExpiry={() => {/* Show form */}}
      />

      <QuantitySelector
        value={selectedQuantity}
        onChange={setSelectedQuantity}
        min={1}
        max={currentProduct.total_draft_quantity}
      />

      <ExpiryPresetButtons
        onSelect={setSelectedDays}
        onPickDate={() => setShowDatePicker(true)}
        selectedDays={selectedDays}
        suggestedDays={currentProduct.last_expiry_days}
      />

      <button onClick={handleActivate}>
        Activate Batch
      </button>
    </div>
  )
}
```

## Design System

All components follow the LIFO.AI design system:

- **Mobile-First**: Optimized for touch with 44px minimum tap targets
- **Color Scheme**: Uses Tailwind primary/secondary colors with dark mode support
- **Spacing**: Consistent 4px grid system
- **Typography**: Responsive font sizes with proper hierarchy
- **Accessibility**: ARIA labels, focus states, keyboard navigation
- **Animations**: Subtle transitions with CSS animations

## Dependencies

- **shadcn/ui**: Button, Card, Badge components
- **Lucide Icons**: Calendar, Package, Plus, Minus, CheckCircle2, etc.
- **date-fns**: Date formatting and manipulation
- **Tailwind CSS**: Utility-first styling
- **Next.js**: Image optimization

## Related Hooks

These components work seamlessly with the batch creation hooks:

- `useDraftBatchesSummary()` - Get summary stats
- `useDraftBatchesByProduct()` - Get products with draft batches
- `useActivateDraftBatch()` - Activate a draft batch
- `useLogDelivery()` - Create draft batches from delivery
- `useRecentDeliveryProducts()` - Get recent delivery history

See `hooks/use-draft-batches.ts` for full documentation.
