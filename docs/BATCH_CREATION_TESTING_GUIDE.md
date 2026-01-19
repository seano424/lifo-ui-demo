# Batch Creation Feature - Complete Testing Guide

**Feature**: Draft Batches & Batch Creation Workflow
**Branch**: `ui/batch-creation-flows`
**Created**: January 19, 2026
**Testing Store**: Sean's Playground Store (ID: `8e380e2d-81bb-40c4-9da3-ce75c0df5e78`)

---

## 📁 1. File Inventory

### **Created Files (17 total)**

#### Hooks (1 file)
- ✅ `hooks/use-draft-batches.ts` (599 lines)
  - React Query hooks for draft batch management
  - All hooks: `useDraftBatchesSummary`, `useDraftBatchesByProduct`, `useActivateDraftBatch`, `useLogDelivery`, `useRecentDeliveryProducts`

#### Components - Batch Creation (9 files)
- ✅ `components/batch-creation/quantity-selector.tsx` - Touch-friendly +/- selector
- ✅ `components/batch-creation/expiry-preset-buttons.tsx` - Preset expiry date buttons
- ✅ `components/batch-creation/draft-batch-card.tsx` - Product card for drafts
- ✅ `components/batch-creation/batch-success-card.tsx` - Success feedback card
- ✅ `components/batch-creation/batch-creation-sheet.tsx` - Multi-step sheet modal (518 lines)
- ✅ `components/batch-creation/index.ts` - Exports barrel
- ✅ `components/batch-creation/README.md` - Component documentation
- ⚠️ `components/batch-creation/batch-creation-example.tsx` - Example (NOT integrated)
- ⚠️ `components/batch-creation/batch-creation-sheet-example.tsx` - Example (NOT integrated)

#### Components - Delivery Log (5 files)
- ✅ `components/delivery-log/delivery-log-sheet.tsx` - Delivery logging sheet (370 lines)
- ✅ `components/delivery-log/recent-product-card.tsx` - Recent product card
- ✅ `components/delivery-log/delivery-summary.tsx` - Delivery summary component
- ✅ `components/delivery-log/index.ts` - Exports barrel
- ⚠️ `components/delivery-log/delivery-log-example.tsx` - Example (NOT integrated)

#### Components - Other (2 files)
- ✅ `components/draft-batch-notification.tsx` - Notification banner & badge
- ✅ `components/ui/scroll-area.tsx` - Radix UI scroll area component

#### Pages/Routes (1 file)
- ✅ `app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx` - Draft batches page (269 lines)

#### Database (1 file)
- ✅ `supabase/migrations/20260119201459_remote_schema.sql` (2,140 lines)
  - Contains RPC functions: `activate_draft_batch`, `get_draft_batches_summary`, `get_draft_batches_by_product`, `log_delivery_create_drafts`

#### Documentation (1 file)
- ✅ `DRAFT_BATCHES_IMPLEMENTATION.md` - Implementation documentation

---

### **Modified Files (12 total)**

#### App & Layout
- ✅ `app/layout.tsx` - Layout updates
- ✅ `components/app-sidebar.tsx` - Added "New Batches" nav item with badge
- ✅ `components/dashboard/dashboard-content.tsx` - Added draft batch notification banner

#### Other Components
- ✅ `components/batches/batch-list-sort-controls.tsx`
- ✅ `components/batches/batches-filtered-list.tsx`
- ✅ `components/products/products-filtered-list.tsx`

#### Configuration & Types
- ✅ `lib/queries/query-keys.ts` - Added draft batch query keys
- ✅ `types/supabase.ts` - Updated types from schema
- ✅ `next.config.ts` - Config updates
- ✅ `package.json` & `package-lock.json` - Dependencies

#### Internationalization
- ✅ `messages/en/dashboard.json` - Added "newBatches": "New Batches"
- ✅ `messages/fr/dashboard.json` - Added "newBatches": "Nouveaux Lots"
- ✅ `messages/nl/dashboard.json` - Added "newBatches": "Nieuwe Batches"

---

## 🗺️ 2. Routes & Navigation

### **New Routes**

| Route | Description | Status |
|-------|-------------|--------|
| `/dashboard/inventory/new` | Draft batches page - list of products needing expiry dates | ✅ **LIVE** |

### **Navigation Integration**

#### **Sidebar Navigation** (`components/app-sidebar.tsx`)
- **Location**: Inventory section (first item)
- **Icon**: `PackagePlus`
- **Label**: "New Batches" (with translations)
- **Badge**: Shows count of draft batches (dynamic)
- **How to see it**: Look for the Inventory section in the left sidebar

#### **Dashboard Banner** (`components/dashboard/dashboard-content.tsx`)
- **Location**: Between dashboard header and main content
- **Component**: `<DraftBatchNotification variant="full" />`
- **Shows**: Orange alert banner with draft count, units, and products
- **Dismissible**: Yes (reappears when new drafts are created)
- **Action Button**: Links to `/dashboard/inventory/new`

#### **Components NOT Yet Integrated**
⚠️ **DeliveryLogSheet** - Built but not added to any page. See "Known Gaps" section below.

---

## 🧪 3. Testing Walkthrough

### **Prerequisites**
1. **Start the app**: `npm run dev`
2. **Login**: Use your authenticated account
3. **Select Store**: Make sure "Sean's Playground Store" is selected
4. **Migration Applied**: Database migration must be applied (`20260119201459_remote_schema.sql`)

---

### **Test A: Draft Batches Notification**

**Where to see it:**
1. Go to `/dashboard` (main dashboard)
2. Look for an **orange banner** between the header and dashboard cards

**What you should see:**
- Orange alert box with package icon
- Text: "X items need expiry dates"
- Subtext: "Y units across Z products are waiting to be activated"
- Button: "Add Expiry Dates" (links to `/dashboard/inventory/new`)
- Dismiss button (X) in top-right corner

**Expected behavior:**
- Banner appears if there are draft batches
- Clicking "Add Expiry Dates" → navigates to `/dashboard/inventory/new`
- Clicking dismiss (X) → hides banner
- Banner reappears if new drafts are created (even after dismissing)

**Badge in Sidebar:**
1. Look at left sidebar, "Inventory" section
2. Find "New Batches" menu item (first in section)
3. You should see a **badge with the draft count** (e.g., "5")

---

### **Test B: Draft Batches Page**

**URL:** `/dashboard/inventory/new`

**How to access:**
1. Click orange notification banner → "Add Expiry Dates" button, OR
2. Click "New Batches" in sidebar navigation

**What you should see:**

#### **Page Header**
- Title: "New Batches"
- Description: "Add expiry dates to activate your inventory"
- Badges showing:
  - "X batches" (with package icon)
  - "Y units"

#### **Category Filter** (if products exist)
- Dropdown button: "Category" with filter icon
- Shows count of active filters
- Clicking opens dropdown with:
  - List of categories
  - Badge next to each category showing draft count
  - Checkboxes to filter by category

#### **Product List**
Each product shows a `DraftBatchCard`:
- Product image placeholder
- Product name and brand
- Category name
- Draft quantity badge (e.g., "24 units in 2 batches")
- Expiry hint (e.g., "Dairy typically expires in +7 days")
- **"Same (+Xd)" button** if product has `last_expiry_days` (quick action)
- **"Add Expiry" or "Different..." button** (opens BatchCreationSheet)

#### **Pagination** (if > 20 products)
- Shows "Showing X to Y of Z products"
- Previous/Next buttons

#### **Empty State** (if no drafts)
- Party popper icon (green background)
- "No draft batches!"
- "All your batches have expiry dates assigned"

---

### **Test C: Batch Creation Flow**

**Trigger:** Click "Add Expiry" or "Different..." button on any `DraftBatchCard`

#### **Step 1: Sheet Opens (Product Selected)**

**What you should see:**
- Sheet slides in from right
- Header: "Set Expiry Date"
- Description: "Product X of Y" (if multiple products)
- Back button (if not single product mode)

**Product Info Card:**
- Product image
- Product name and brand
- "X units in Y batches" text
- Blue info box: "Category typically expires in +N days"

**Quantity Selector:**
- Label: "Select Quantity"
- Large +/- buttons (44px tap targets)
- Current quantity displayed prominently
- Max value is total draft quantity
- If quantity < total → Shows split warning: "Batch will be split. X units will remain in draft."

**Expiry Preset Buttons:**
- Label: "Choose Expiry Date"
- 6 preset buttons: +3d, +7d, +14d, +30d, +60d, +90d
- Each button shows:
  - Days label (e.g., "+7d")
  - Calculated expiry date (e.g., "Jan 26")
- **Suggested preset highlighted** if product has `last_expiry_days`
- "Pick Date" button (calendar icon)

**Custom Date Picker:**
- Click "Pick Date" → Date input appears with animation
- Calendar icon on left side
- Date input field (type="date")
- Min date = today
- Shows green checkmark when date selected

**Add Batch Button:**
- Full width
- Shows selected quantity: "Add Batch (X units)"
- Disabled if no expiry date selected
- Shows "Adding Batch..." when loading

#### **Step 2: Success State**

**What you should see:**
- Sheet content transitions to success card
- Header changes to: "Batch Added"
- Description: "Successfully activated batch"

**Success Card Content:**
- Animated green checkmark icon (pulsing)
- "Batch Activated!"
- Shows quantity and expiry date
- **If batch was split** → Warning: "Batch was split. X units remain in draft."

**Action Buttons:**
- **If split**: "Add Another Batch" (green) → Goes back to expiry entry for remaining units
- "Continue" or "Skip" button → Moves to next product or closes

#### **Step 3: Multi-Product Flow**

If multiple products:
1. After clicking "Continue" → Sheet shows next product in list
2. Process repeats for each product
3. Sheet closes when all products processed or user clicks back

---

### **Test D: "Same (+Xd)" Quick Action**

**Trigger:** Click "Same (+Xd)" button on a product card that has `last_expiry_days`

**Expected behavior:**
1. Opens `BatchCreationSheet` with that product
2. Expiry preset is **pre-selected** to the last used value (e.g., +7d)
3. Quantity defaults to total draft quantity
4. User can still change both values
5. Clicking "Add Batch" activates with suggested values

**Example:**
- Product: "Organic Milk"
- Last time you set: +7 days
- Card shows: "Same (+7d)" button
- Click → Sheet opens with +7d already selected

---

### **Test E: Batch Split Handling**

**How to trigger:**
1. Open batch creation for a product with 24 units
2. Set quantity to 10 (less than total)
3. Select expiry date
4. Click "Add Batch"

**Expected result:**
- Success card shows: "Batch was split. 14 units remain in draft."
- "Add Another Batch" button appears (green)
- Clicking it → Returns to expiry entry with:
  - Quantity reset to 14 (remaining units)
  - Expiry date cleared
  - Ready to create another batch

**Database behavior:**
- Original batch with 24 units is deactivated
- New active batch with 10 units is created (with expiry date)
- New draft batch with 14 units is created
- Both batches linked to same product

---

### **Test F: Delivery Log Flow** ⚠️ **NOT YET INTEGRATED**

**Status:** `DeliveryLogSheet` component is built but NOT added to any page.

**To preview it:**
1. Create a test page at `app/(dashboard)/dashboard/test-delivery/page.tsx`
2. Import and use one of the examples from `components/delivery-log/delivery-log-example.tsx`
3. Visit `/dashboard/test-delivery`

**Or quickly test:**
```tsx
// In any existing page, import and add:
import { DeliveryLogButton } from '@/components/delivery-log/delivery-log-example'

// Then render:
<DeliveryLogButton />
```

**Expected flow (when integrated):**
1. Click button → Sheet opens from right
2. Search bar at top for filtering products
3. List of recent/frequent products with quick-add buttons
4. User adds products → Running summary at bottom
5. Click "Done with Delivery" → Creates draft batches
6. Prompt: "Would you like to add expiry dates now?"
7. If Yes → Opens `BatchCreationSheet` with newly created drafts

---

## 💾 4. Test Data Setup

### **Verify Active Store**

**Check current store:**
1. Look at top-left corner of app (TeamSwitcher component)
2. Should show: "Sean's Playground Store"
3. Store ID should be: `8e380e2d-81bb-40c4-9da3-ce75c0df5e78`

**If different store is selected:**
1. Click store name dropdown
2. Select "Sean's Playground Store"

---

### **Create Test Draft Batches**

**Option 1: Using Database Migration**
If migration was run successfully, draft batches should already exist.

**Option 2: Manual Creation via SQL**
```sql
-- Check existing draft batches
SELECT
  b.batch_id,
  b.batch_number,
  b.quantity,
  b.is_draft,
  p.product_name
FROM inventory.batches b
JOIN inventory.products p ON b.product_id = p.product_id
WHERE b.store_id = '8e380e2d-81bb-40c4-9da3-ce75c0df5e78'
  AND b.is_draft = true
  AND b.is_active = true;

-- Create a test draft batch (if none exist)
INSERT INTO inventory.batches (
  store_id,
  product_id,
  batch_number,
  quantity,
  is_draft,
  is_active,
  created_by
)
VALUES (
  '8e380e2d-81bb-40c4-9da3-ce75c0df5e78',
  'your-product-id-here', -- Replace with actual product ID
  'DRAFT-001',
  24,
  true,
  true,
  'your-user-id-here' -- Replace with actual user ID
);
```

**Option 3: Use `useLogDelivery` Hook in Browser Console**
1. Open browser dev tools
2. Find the React DevTools or use console
3. Trigger `useLogDelivery` mutation manually (advanced)

---

### **Verify Test Data**

**Check if draft batches exist:**
1. Go to `/dashboard/inventory/new`
2. Should see products listed
3. If empty state → No draft batches in database

**Query to check draft count:**
```sql
SELECT COUNT(*) as draft_count
FROM inventory.batches
WHERE store_id = '8e380e2d-81bb-40c4-9da3-ce75c0df5e78'
  AND is_draft = true
  AND is_active = true;
```

**Expected products with drafts:**
Look for products in these categories:
- Dairy
- Bakery
- Meat
- Produce

Each product should show:
- Draft batch count (e.g., "2 batches")
- Total quantity (e.g., "24 units")
- Last expiry days (if previously set)

---

## 🎨 5. Component Preview (Isolated Testing)

Since some components aren't fully integrated, here's how to preview them in isolation:

### **Quick Preview Page**

Create: `app/(dashboard)/dashboard/component-test/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// Batch Creation Components
import {
  QuantitySelector,
  ExpiryPresetButtons,
  DraftBatchCard,
  BatchSuccessCard,
} from '@/components/batch-creation'

// Delivery Log Components
import { DeliveryLogButton } from '@/components/delivery-log/delivery-log-example'

export default function ComponentTestPage() {
  const [quantity, setQuantity] = useState(12)
  const [selectedDays, setSelectedDays] = useState<number | null>(null)

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Component Preview</h1>

      {/* Quantity Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Quantity Selector</CardTitle>
        </CardHeader>
        <CardContent>
          <QuantitySelector
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={100}
          />
        </CardContent>
      </Card>

      {/* Expiry Preset Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Expiry Preset Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpiryPresetButtons
            onSelect={setSelectedDays}
            onPickDate={() => console.log('Pick date clicked')}
            selectedDays={selectedDays}
            suggestedDays={7}
          />
          {selectedDays && (
            <p className="mt-4 text-sm text-gray-600">
              Selected: +{selectedDays} days
            </p>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Delivery Log Button */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Log Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryLogButton />
        </CardContent>
      </Card>
    </div>
  )
}
```

**Access:** Visit `/dashboard/component-test`

---

### **Example Files Available**

Use these as reference implementations:

1. **`components/batch-creation/batch-creation-example.tsx`**
   - Shows all batch creation components in isolation
   - Mock data for testing without database

2. **`components/batch-creation/batch-creation-sheet-example.tsx`**
   - Shows BatchCreationSheet usage patterns
   - Single product vs. multi-product mode

3. **`components/delivery-log/delivery-log-example.tsx`**
   - 5 different usage examples
   - Simple button, dashboard card, floating button, etc.

**To use:**
- Import the example components into any page
- They're fully functional with mock data

---

## ⚠️ 6. Known Gaps & Unconnected Pieces

### **🔴 Major Gap: DeliveryLogSheet Not Integrated**

**What's missing:**
- `DeliveryLogSheet` component is fully built but NOT added to any page
- No button or link to open the delivery log

**Expected integration points:**
1. **Dashboard "Add Delivery" button** (`components/dashboard/add-delivery-button.tsx`)
   - Currently links to `/dashboard/deliveries`
   - Should open `DeliveryLogSheet` instead

2. **Inventory page** - Add a "Log Delivery" button
3. **Floating action button** for mobile (optional)

**How to fix:**
Replace `AddDeliveryButton` component:

```tsx
// components/dashboard/add-delivery-button.tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { DeliveryLogSheet } from '@/components/delivery-log'

export function AddDeliveryButton() {
  const t = useTranslations('dashboard.actions')
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        size="lg"
        variant="gray"
        className="w-full rounded-lg"
        onClick={() => setIsOpen(true)}
      >
        {t('addDelivery')}
      </Button>

      <DeliveryLogSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        onComplete={() => console.log('Delivery logged!')}
      />
    </>
  )
}
```

---

### **🟡 Minor Gaps**

#### **1. Example Files in Production Build**
- `*-example.tsx` files are included in build
- Should be excluded or moved to a `/examples` directory
- Not critical, but adds unnecessary bundle size

#### **2. No Direct "Log Delivery" Navigation**
- Users can't directly navigate to delivery logging
- Only accessible via button (when integrated)
- Consider adding `/dashboard/deliveries/log` route if needed

#### **3. Notification Persistence**
- Banner dismissal stored in `localStorage`
- Not synced across devices/browsers
- Consider moving to database if needed

#### **4. No Bulk Actions**
- Can't select multiple products and set same expiry
- Each product must be processed individually
- See "Future Enhancements" in `DRAFT_BATCHES_IMPLEMENTATION.md`

---

## ✅ 7. Testing Checklist

Use this checklist to verify everything works:

### **Navigation & UI**
- [ ] Dashboard loads without errors
- [ ] Orange notification banner appears (if drafts exist)
- [ ] "New Batches" appears in sidebar with badge
- [ ] Badge shows correct draft count
- [ ] Clicking banner → navigates to `/dashboard/inventory/new`
- [ ] Clicking sidebar item → navigates to `/dashboard/inventory/new`

### **Draft Batches Page**
- [ ] Page loads at `/dashboard/inventory/new`
- [ ] Header shows correct draft count and units
- [ ] Product cards display correctly
- [ ] Category filter dropdown works
- [ ] Active filter pills appear and are removable
- [ ] "Clear all" button clears filters
- [ ] Pagination appears if > 20 products
- [ ] Empty state shows when no drafts

### **Batch Creation Sheet**
- [ ] Clicking "Add Expiry" opens sheet from right
- [ ] Product info displays correctly
- [ ] Quantity selector works (+/- buttons)
- [ ] Expiry preset buttons are clickable
- [ ] Selected preset is highlighted
- [ ] Suggested preset shows indicator (if exists)
- [ ] "Pick Date" toggles custom date input
- [ ] Custom date picker works
- [ ] "Add Batch" button is disabled until date selected
- [ ] Clicking "Add Batch" shows loading state

### **Batch Activation**
- [ ] Success card appears after activation
- [ ] Success message shows quantity and expiry date
- [ ] If split → Shows split warning
- [ ] If split → "Add Another Batch" button appears
- [ ] Clicking "Add Another Batch" → returns to form
- [ ] Remaining quantity is correct after split
- [ ] "Continue" button moves to next product
- [ ] Sheet closes when all products done

### **"Same (+Xd)" Quick Action**
- [ ] Button appears on products with history
- [ ] Shows correct last expiry days
- [ ] Clicking opens sheet with preset selected
- [ ] Can still change values before submitting

### **Notification Behavior**
- [ ] Banner can be dismissed
- [ ] Dismissal persists on page reload
- [ ] Banner reappears when draft count increases
- [ ] Badge count updates in real-time

### **Data & Hooks**
- [ ] `useDraftBatchesSummary()` returns correct data
- [ ] `useDraftBatchesByProduct()` returns products
- [ ] `useActivateDraftBatch()` mutation succeeds
- [ ] Toast notifications appear on success/error
- [ ] Queries refetch after activation
- [ ] Draft count decreases after activation

### **Edge Cases**
- [ ] Works with 0 draft batches (empty state)
- [ ] Works with 1 product
- [ ] Works with 20+ products (pagination)
- [ ] Works with split batches
- [ ] Works when activating all quantity (no split)
- [ ] Error handling if activation fails
- [ ] Loading states show correctly

### **Accessibility**
- [ ] Can navigate with keyboard
- [ ] Focus states visible
- [ ] ARIA labels present
- [ ] Screen reader compatible
- [ ] Touch targets ≥ 44px

### **Mobile**
- [ ] Sheet works on mobile
- [ ] Buttons are touch-friendly
- [ ] Text is readable
- [ ] No horizontal scroll
- [ ] Animations smooth

---

## 🚀 Quick Start Test Script

Copy and run this in order:

```bash
# 1. Start the app
npm run dev

# 2. Visit dashboard
# Open: http://localhost:3000/dashboard
# ✓ Check for orange notification banner
# ✓ Check sidebar for "New Batches" with badge

# 3. Visit draft batches page
# Open: http://localhost:3000/dashboard/inventory/new
# ✓ Should see product list or empty state

# 4. Click "Add Expiry" on a product
# ✓ Sheet should open from right
# ✓ Select quantity, choose expiry preset
# ✓ Click "Add Batch"
# ✓ Success card should appear

# 5. Check draft count decreased
# ✓ Go back to /dashboard
# ✓ Notification banner count should be 1 less
```

---

## 🐛 Troubleshooting

### **No products showing on /dashboard/inventory/new**
1. Check if migration was applied: `npm run supabase:status`
2. Verify draft batches exist in database (see SQL in section 4)
3. Check browser console for errors
4. Verify active store is selected

### **"Add Batch" button not working**
1. Check browser console for errors
2. Verify RPC function exists: `inventory.activate_draft_batch`
3. Check network tab for failed API calls
4. Try with different quantity/expiry values

### **Notification banner not appearing**
1. Ensure draft batches exist (query database)
2. Check if banner was dismissed (clear localStorage: `lifo_dismissed_drafts`)
3. Refresh page
4. Check `useDraftBatchesSummary` hook returns data

### **Sheet not opening**
1. Check if `<BatchCreationSheet>` is rendered in page
2. Verify `open` prop is being set to `true`
3. Check z-index conflicts in browser inspector
4. Look for JavaScript errors in console

---

## 📚 Additional Resources

- **Implementation Doc**: `DRAFT_BATCHES_IMPLEMENTATION.md`
- **Component README**: `components/batch-creation/README.md`
- **Hook Documentation**: `hooks/use-draft-batches.ts` (inline JSDoc comments)
- **Database Functions**: `supabase/migrations/20260119201459_remote_schema.sql`

---

## 🎯 Summary

**✅ Fully Integrated:**
- Draft Batches Page (`/dashboard/inventory/new`)
- Batch Creation Sheet (multi-step flow)
- Draft Batch Notification (banner + sidebar badge)
- All React Query hooks
- Database RPC functions

**⚠️ Built But Not Integrated:**
- `DeliveryLogSheet` - Requires button/link to open it
- Example components (`*-example.tsx`) - For reference only

**🎉 Ready to Test:**
1. Visit `/dashboard/inventory/new`
2. Click product → Set expiry date
3. See success feedback
4. Repeat for other products

**Next Steps:**
1. Integrate `DeliveryLogSheet` into dashboard (replace `AddDeliveryButton`)
2. Test complete workflow: Log Delivery → Add Expiry Dates → Done
3. Create test data if needed
4. Report any bugs or edge cases found

---

**Happy Testing! 🚀**
