# LIFO Batch Tracking Onboarding Wizard - Complete Task Breakdown

## Overview

**Total Tasks:** 18  
**Estimated Time:** 14-16 hours  
**Purpose:** Build a 6-screen onboarding wizard for batch tracking setup

---

## Task Summary Table

| Phase | Task | Description                                | Est. Time |
| ----- | ---- | ------------------------------------------ | --------- |
| **0** | 1    | RPC: get_categories_with_tracking_settings | 30 min    |
| **0** | 2    | RPC: get_products_for_tracking_setup       | 45 min    |
| **0** | 3    | RPC: save_batch_tracking_setup             | 45 min    |
| **1** | 4    | Zustand store                              | 45 min    |
| **1** | 5    | React Query hooks                          | 45 min    |
| **1** | 6    | Page container + folder structure          | 30 min    |
| **1** | 7    | ProgressIndicator component                | 20 min    |
| **2** | 8    | Screen 1 (Welcome)                         | 45 min    |
| **2** | 9    | Screen 6 (Success)                         | 30 min    |
| **2** | 10   | Screen 2 - Radio cards                     | 1 hr      |
| **2** | 11   | Screen 2 - Category list                   | 45 min    |
| **3** | 12   | Screen 3 (Category Automation)             | 1.5 hr    |
| **3** | 13   | ProductOverrideCard component              | 45 min    |
| **3** | 14   | Screen 4 (Product Overrides)               | 1.5 hr    |
| **4** | 15   | Screen 5 (Review)                          | 1 hr      |
| **4** | 16   | Save mutation + complete flow              | 1 hr      |
| **4** | 17   | Loading/Error states                       | 45 min    |
| **4** | 18   | Final polish + testing                     | 1.5 hr    |

---

## PHASE 0: Database Prerequisites (Tasks 1-3)

> ⚠️ **These must be done first since the UI depends on them.**

---

### TASK 1: Create RPC Function - get_categories_with_tracking_settings

**Estimated Time:** 30 min

#### Context
We're building a batch tracking onboarding wizard. Screen 2 and Screen 3 need to display categories with their tracking settings and product counts.

#### Database Context
- Categories are in `inventory.categories`
- Store-specific category settings are in `inventory.store_category_settings`
- Products are in `inventory.store_products` (linked to categories)
- Each store has its own settings that can override category defaults

#### RPC Function to Create

Create a PostgreSQL function `get_categories_with_tracking_settings` that:

**Parameters:**
- `p_store_id UUID` - The store to get categories for

**Returns (for each category):**
- `category_id UUID`
- `category_code TEXT`
- `display_name_en TEXT`
- `display_name_fr TEXT`
- `typical_shelf_life_days INTEGER` (from categories table - the default)
- `is_tracked BOOLEAN` (from store_category_settings, default true)
- `auto_create_batches BOOLEAN` (from store_category_settings, default false)
- `default_shelf_life_days INTEGER` (from store_category_settings, can override typical)
- `product_count BIGINT` (count of products in this category for this store)

**Logic:**
1. LEFT JOIN `inventory.categories` with `inventory.store_category_settings` on category_id and store_id
2. Count products from `inventory.store_products` where category_id matches and store_id matches
3. Use COALESCE for settings that might not exist yet (default is_tracked=true, auto_create_batches=false)
4. Order by display_name_en

#### Acceptance Criteria
- [ ] Function created via Supabase migration
- [ ] Returns all categories even if no store_category_settings row exists
- [ ] Product count is accurate per store
- [ ] Handles stores with no products gracefully (returns categories with 0 count)

#### Notes
- Use `supabase-lifo:apply_migration` to create the function
- The function should be in the `public` schema for RPC access

---

### TASK 2: Create RPC Function - get_products_for_tracking_setup

**Estimated Time:** 45 min

#### Context
Screen 4 (Product Overrides) needs paginated products with their tracking settings, including inherited values from category settings.

#### Database Context
- Products are in `inventory.store_products`
- Categories are in `inventory.categories`
- Category settings are in `inventory.store_category_settings`
- Product overrides are stored directly on `inventory.store_products`:
  - `is_tracked_for_batches BOOLEAN`
  - `shelf_life_override_days INTEGER`
  - `auto_create_batches BOOLEAN`

#### RPC Function to Create

Create a PostgreSQL function `get_products_for_tracking_setup` that:

**Parameters:**
- `p_store_id UUID` - Required
- `p_category_id UUID` - Optional filter by category (NULL = all categories)
- `p_search_term TEXT` - Optional search in product name (NULL = no filter)
- `p_only_tracked BOOLEAN` - Optional filter for tracked products only (NULL = all)
- `p_page_size INTEGER` - Pagination size (default 20)
- `p_offset INTEGER` - Pagination offset (default 0)

**Returns (for each product):**
- `product_id UUID`
- `name TEXT`
- `brand TEXT`
- `barcode TEXT`
- `image_url TEXT`
- `category_id UUID`
- `category_name TEXT` (display_name_en from categories)
- `typical_shelf_life_days INTEGER` (from categories - the base default)
- `is_tracked_for_batches BOOLEAN` (from store_products)
- `shelf_life_override_days INTEGER` (from store_products, NULL if not overridden)
- `auto_create_batches BOOLEAN` (from store_products, NULL means inherit)
- `inherited_auto_create BOOLEAN` (from store_category_settings - what category says)
- `total_count BIGINT` (total matching records for pagination)

**Logic:**
1. JOIN store_products with categories
2. LEFT JOIN with store_category_settings to get inherited values
3. Apply filters (category, search with ILIKE, only_tracked)
4. Include total_count using COUNT(*) OVER()
5. Apply pagination with LIMIT and OFFSET
6. Order by name ASC

#### Acceptance Criteria
- [ ] Function created via Supabase migration
- [ ] Search is case-insensitive on product name
- [ ] Pagination works correctly with total_count
- [ ] inherited_auto_create shows category-level setting
- [ ] Handles NULL category_id filter (returns all categories)

#### Notes
- Use `supabase-lifo:apply_migration` to create the function

---

### TASK 3: Create RPC Function - save_batch_tracking_setup

**Estimated Time:** 45 min

#### Context
When the user completes the onboarding wizard (Screen 5 → Finish), we need to save all their configuration atomically.

#### Database Context
- Store settings with batch_tracking_config JSONB are in `business.store_settings`
- Category settings go to `inventory.store_category_settings`
- Product overrides go to `inventory.store_products`

#### RPC Function to Create

Create a PostgreSQL function `save_batch_tracking_setup` that:

**Parameters:**
- `p_store_id UUID` - The store
- `p_config JSONB` - The batch_tracking_config to save:
  ```json
  {
    "enabled": true,
    "setup_completed": true,
    "setup_completed_at": "2026-02-03T...",
    "product_selection_mode": "all" | "by_category" | "individual",
    "selected_category_ids": ["uuid1", "uuid2"],
    "selected_product_ids": ["uuid1", "uuid2"]
  }
  ```
- `p_category_settings JSONB[]` - Array of category settings:
  ```json
  [
    {
      "category_id": "uuid",
      "is_tracked": true,
      "auto_create_batches": true,
      "default_shelf_life_days": 14
    }
  ]
  ```
- `p_product_overrides JSONB[]` - Array of product overrides:
  ```json
  [
    {
      "product_id": "uuid",
      "is_tracked_for_batches": true,
      "shelf_life_override_days": 7,
      "auto_create_batches": true
    }
  ]
  ```

**Returns:**
```json
{
  "success": true,
  "setup_completed": true,
  "categories_updated": 3,
  "products_updated": 2
}
```

**Logic:**
1. UPDATE `business.store_settings` SET batch_tracking_config = p_config WHERE store_id = p_store_id
2. For each category in p_category_settings:
   - UPSERT into `inventory.store_category_settings`
3. For each product in p_product_overrides:
   - UPDATE `inventory.store_products` SET the override fields
4. Return counts of what was updated
5. Wrap in transaction (implicit in function)

#### Acceptance Criteria
- [ ] Function created via Supabase migration
- [ ] Atomically saves all three parts (config, categories, products)
- [ ] Uses UPSERT for category settings (creates if not exists)
- [ ] Returns accurate counts
- [ ] Handles empty arrays gracefully

#### Notes
- Use `supabase-lifo:apply_migration` to create the function
- Consider using `jsonb_array_elements` to iterate arrays

---

## PHASE 1: Foundation (Tasks 4-7)

---

### TASK 4: Create Zustand Store for Batch Tracking Onboarding

**Estimated Time:** 45 min

#### Context
We need a persisted Zustand store to manage state across the 6-screen onboarding wizard. The state should persist to localStorage so users can resume if they leave mid-setup.

#### File to Create
`lib/stores/batch-tracking-onboarding-store.ts`

#### State Shape
```typescript
interface BatchTrackingOnboardingState {
  // Navigation
  currentScreen: 1 | 2 | 3 | 4 | 5 | 6
  
  // Screen 2: Product Selection
  productSelection: {
    mode: 'all' | 'by_category' | 'individual' | null
    selectedCategoryIds: string[]
    selectedProductIds: string[]
  }
  
  // Screen 3: Category Automation
  categorySettings: Array<{
    categoryId: string
    categoryName: string
    productCount: number
    defaultShelfLifeDays: number | null
    autoCreateBatches: boolean
  }>
  
  // Screen 4: Product Overrides
  productOverrides: Array<{
    productId: string
    shelfLifeOverrideDays: number | null
    autoCreateBatches: boolean | null
  }>
  
  // Screen 6: Result
  setupResult: {
    success: boolean
    categoriesUpdated: number
    productsUpdated: number
  } | null
}
```

#### Actions to Implement
```typescript
// Navigation
setCurrentScreen: (screen: 1 | 2 | 3 | 4 | 5 | 6) => void
goToNextScreen: () => void
goToPreviousScreen: () => void

// Screen 2
setProductSelectionMode: (mode: 'all' | 'by_category' | 'individual') => void
toggleCategorySelection: (categoryId: string) => void
toggleProductSelection: (productId: string) => void

// Screen 3
initializeCategorySettings: (categories: CategoryData[]) => void
updateCategorySettings: (categoryId: string, updates: Partial<CategorySetting>) => void

// Screen 4
updateProductOverride: (productId: string, updates: Partial<ProductOverride>) => void
clearProductOverride: (productId: string) => void

// Completion
setSetupResult: (result: SetupResult) => void
resetWizard: () => void

// Validation helpers (computed)
canProceedFromScreen2: () => boolean
getTrackedProductCount: () => number
getAutomatedCategoryCount: () => number
getProductOverrideCount: () => number
```

#### Requirements
- Use Zustand's `persist` middleware with localStorage
- Storage key: `'lifo-batch-tracking-onboarding'`
- Only persist: currentScreen, productSelection, categorySettings, productOverrides
- Don't persist: setupResult (it's transient)

#### Acceptance Criteria
- [ ] Store created with all state and actions
- [ ] Persists to localStorage
- [ ] Can navigate between screens
- [ ] Can toggle selections
- [ ] resetWizard clears all state

#### File Location
Create at: `lib/stores/batch-tracking-onboarding-store.ts`

---

### TASK 5: Create React Query Hooks for Batch Tracking Onboarding

**Estimated Time:** 45 min

#### Context
We need React Query hooks to fetch data from the RPC functions and handle the save mutation.

#### Files to Create/Modify

1. **Add query keys** to `lib/queries/query-keys.ts`:
```typescript
batchTrackingOnboarding: {
  all: ['batch-tracking-onboarding'] as const,
  categories: (storeId: string) => 
    [...queryKeys.batchTrackingOnboarding.all, 'categories', storeId] as const,
  products: (storeId: string, filters: ProductFilters) => 
    [...queryKeys.batchTrackingOnboarding.all, 'products', storeId, filters] as const,
}
```

2. **Create hooks file** at `lib/queries/batch-tracking-onboarding.ts`:

#### Hooks to Implement

**useCategoriesWithTrackingSettings(storeId: string)**
- Calls RPC `get_categories_with_tracking_settings`
- staleTime: 5 minutes
- Returns array of categories with settings

**useProductsForTrackingSetup(storeId, options)**
- Calls RPC `get_products_for_tracking_setup`
- Options: { categoryId, searchTerm, onlyTracked, pageSize, offset }
- staleTime: 2 minutes
- Returns paginated products

**useSaveBatchTrackingSetup()**
- Mutation that calls RPC `save_batch_tracking_setup`
- On success: invalidate batch-tracking-onboarding queries
- Returns mutation object with mutateAsync

#### Type Definitions
```typescript
export interface CategoryWithTracking {
  category_id: string
  category_code: string
  display_name_en: string
  typical_shelf_life_days: number | null
  is_tracked: boolean
  auto_create_batches: boolean
  default_shelf_life_days: number | null
  product_count: number
}

export interface ProductForTracking {
  product_id: string
  name: string
  brand: string | null
  category_id: string
  category_name: string
  typical_shelf_life_days: number | null
  is_tracked_for_batches: boolean
  shelf_life_override_days: number | null
  auto_create_batches: boolean | null
  inherited_auto_create: boolean
  total_count: number
}
```

#### Acceptance Criteria
- [ ] Query keys added to query-keys.ts
- [ ] All 3 hooks created and exported
- [ ] Types defined for return values
- [ ] Proper error handling
- [ ] Invalidation on mutation success

---

### TASK 6: Create Wizard Container Page and Folder Structure

**Estimated Time:** 30 min

#### Context
We need the main page that renders the appropriate screen based on wizard state.

#### Folder Structure to Create
```
app/
  (onboarding)/
    batch-tracking/
      page.tsx              ← Main container (this task)
      layout.tsx            ← Simple layout wrapper
      components/
        progress-indicator.tsx
        (screen components will go here)
```

#### Files to Create

**1. app/(onboarding)/batch-tracking/layout.tsx**
```typescript
export default function BatchTrackingOnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
```

**2. app/(onboarding)/batch-tracking/page.tsx**

This should:
- Be a client component ('use client')
- Import the Zustand store
- Get currentScreen from store
- Render a switch/map of screen components
- For now, render placeholder divs for each screen

```typescript
'use client'

import { useBatchTrackingOnboardingStore } from '@/lib/stores/batch-tracking-onboarding-store'

export default function BatchTrackingOnboardingPage() {
  const { currentScreen } = useBatchTrackingOnboardingStore()

  // Placeholder screens for now
  const screens: Record<number, React.ReactNode> = {
    1: <div className="p-8">Screen 1: Welcome (coming soon)</div>,
    2: <div className="p-8">Screen 2: Select Products (coming soon)</div>,
    3: <div className="p-8">Screen 3: Category Automation (coming soon)</div>,
    4: <div className="p-8">Screen 4: Product Overrides (coming soon)</div>,
    5: <div className="p-8">Screen 5: Review (coming soon)</div>,
    6: <div className="p-8">Screen 6: Success (coming soon)</div>,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {screens[currentScreen]}
    </div>
  )
}
```

**3. Create empty components folder**
- Just create the folder: `app/(onboarding)/batch-tracking/components/`

#### Acceptance Criteria
- [ ] Folder structure created
- [ ] Layout file created
- [ ] Page renders based on currentScreen
- [ ] Page is accessible at /batch-tracking
- [ ] Zustand store integration works

---

### TASK 7: Create ProgressIndicator Component

**Estimated Time:** 20 min

#### Context
All screens (1-5) need a progress indicator showing current step. Screen 6 (Success) doesn't show it.

#### File to Create
`app/(onboarding)/batch-tracking/components/progress-indicator.tsx`

#### Design Reference (from wireframe)
- Row of dots + "Step X of Y" text
- Current step: wider pill (w-6), dark gray (bg-gray-800)
- Completed steps: small dot (w-2), dark gray (bg-gray-600)
- Future steps: small dot (w-2), light gray (bg-gray-300)
- Text: "Step {current} of {total}" in gray-500

#### Component Interface
```typescript
interface ProgressIndicatorProps {
  currentStep: number
  totalSteps: number
}
```

#### Implementation
```typescript
export function ProgressIndicator({ currentStep, totalSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNumber = i + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep
        
        return (
          <div
            key={i}
            className={cn(
              'h-2 rounded-full transition-all',
              isActive && 'w-6 bg-gray-800',
              isCompleted && 'w-2 bg-gray-600',
              !isActive && !isCompleted && 'w-2 bg-gray-300'
            )}
          />
        )
      })}
      <span className="ml-4 text-sm text-gray-500">
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  )
}
```

#### Acceptance Criteria
- [ ] Component created and exported
- [ ] Visual matches wireframe (dots + text)
- [ ] Current step is highlighted with wider pill
- [ ] Completed steps show different color
- [ ] Uses cn() from lib/utils for className merging

---

## PHASE 2: Core Screens (Tasks 8-11)

---

### TASK 8: Create Screen 1 - Welcome

**Estimated Time:** 45 min

#### Context
The welcome screen introduces batch tracking and gives users the option to start or skip setup.

#### File to Create
`app/(onboarding)/batch-tracking/components/screen-1-welcome.tsx`

#### Design Reference
- Header: LIFO logo left, "Skip setup →" link right
- Center content:
  - Icon visual (Package → Calendar → Check icons in a row)
  - Headline: "Get set up in 2 minutes"
  - Subtext explaining batches
  - White card with 3 bullet points (empty circles, not checkmarks)
  - Primary button: "Let's get started →"
  - Ghost button: "I'll do this later"
  - ProgressIndicator (Step 1 of 5)

#### Component Interface
```typescript
interface Screen1WelcomeProps {
  onNext: () => void
  onSkip: () => void
}
```

#### Icons to Use (from lucide-react)
- Package, Calendar, Check (for the visual)
- ChevronRight (for buttons)

#### Layout Structure
```
<div className="min-h-screen bg-gray-50 flex flex-col">
  <header> ... </header>
  <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-lg mx-auto text-center">
    {/* Icon visual */}
    {/* Headline + subtext */}
    {/* White card with bullet points */}
    {/* Buttons */}
    {/* ProgressIndicator */}
  </main>
</div>
```

#### Bullet Points Text
1. "Choose what products to track"
2. "Set up automatic expiration dates"
3. "Start reducing waste immediately"

#### Integration
After creating, update page.tsx to import and render this component for screen 1.

#### Acceptance Criteria
- [ ] Component matches wireframe design
- [ ] "Let's get started" calls onNext
- [ ] "I'll do this later" and "Skip setup" both call onSkip
- [ ] ProgressIndicator shows Step 1 of 5
- [ ] Responsive on mobile

---

### TASK 9: Create Screen 6 - Success

**Estimated Time:** 30 min

#### Context
The success screen celebrates completion and provides next action options.

#### File to Create
`app/(onboarding)/batch-tracking/components/screen-6-success.tsx`

#### Design Reference
- Centered content (no header with back/skip)
- Large checkmark icon in gray box
- Headline: "You're all set!"
- Subtext: "Your batch tracking is configured and ready to go."
- White card "What's next?" with 3 action buttons:
  1. Plus icon - "Create your first batch" - "Add products from your next delivery"
  2. LayoutDashboard icon - "Explore the dashboard" - "See your inventory overview"
  3. Settings icon - "Review settings" - "Adjust automation rules anytime"
- Primary button: "Go to Dashboard"
- NO ProgressIndicator (this is post-completion)

#### Component Interface
```typescript
interface Screen6SuccessProps {
  onGoToDashboard: () => void
  onCreateBatch?: () => void
  onExploreDashboard?: () => void
  onReviewSettings?: () => void
}
```

#### Icons (lucide-react)
- CheckCircle (large success icon)
- Plus, LayoutDashboard, Settings (action card icons)

#### Action Card Structure
```typescript
const actions = [
  { 
    icon: Plus, 
    title: 'Create your first batch', 
    description: 'Add products from your next delivery' 
  },
  // ... etc
]
```

#### Integration
- Update page.tsx to render this for screen 6
- onGoToDashboard should: reset wizard store, navigate to /dashboard
- Other actions can navigate to respective pages

#### Acceptance Criteria
- [ ] Component matches wireframe design
- [ ] No progress indicator shown
- [ ] Action cards are clickable buttons
- [ ] "Go to Dashboard" is prominent primary button
- [ ] On dashboard click, wizard state is reset

---

### TASK 10: Create Screen 2 - Select Products (Radio Cards Only)

**Estimated Time:** 1 hour

#### Context
Screen 2 lets users choose HOW they want to select products. This task implements the 3 radio card options. The category/product selection lists will be added in the next task.

#### File to Create
`app/(onboarding)/batch-tracking/components/screen-2-select-products.tsx`

#### Design Reference
- Header: "← Back" left, "Skip setup →" right
- Headline: "What would you like to track?"
- Subtext: "Select the products you want to manage with batch tracking."
- 3 radio cards (clickable, with selection ring):
  1. "All products (X items)" - no description
  2. "Select by category" - "Choose specific categories from your Square catalog"
  3. "Select individual products" - "Hand-pick which products to track"
- ProgressIndicator (Step 2 of 5)
- "Next" button (disabled until selection made)

#### State Management
Use Zustand store:
- Read: productSelection.mode
- Write: setProductSelectionMode()

#### Data Fetching
- Use useCategoriesWithTrackingSettings to get total product count
- Sum all category.product_count for "All products (X items)"

#### Radio Card Design
```
Selected: border-gray-800, ring-2 ring-gray-800, bg-gray-50
Unselected: border-gray-200, hover:border-gray-400
```

Radio indicator (right side):
- Selected: dark circle with white checkmark
- Unselected: empty circle with gray border

#### Component Interface
```typescript
// No props needed - uses Zustand store and React Query
export function Screen2SelectProducts() { ... }
```

#### Conditional Content (placeholder for next task)
```typescript
{productSelection.mode === 'by_category' && (
  <div className="bg-white rounded-xl border p-4 mb-6">
    {/* CategoryCheckboxList will go here */}
    <p className="text-gray-500">Category selection coming soon...</p>
  </div>
)}
```

#### Acceptance Criteria
- [ ] 3 radio cards render with correct styling
- [ ] Clicking card updates Zustand store
- [ ] Selected card shows visual feedback (ring, checkmark)
- [ ] Total product count fetched from API
- [ ] "Next" button only enabled when mode is selected
- [ ] Back/Skip navigation works

---

### TASK 11: Create CategoryCheckboxList for Screen 2

**Estimated Time:** 45 min

#### Context
When user selects "Select by category" mode, we need to show a searchable list of categories with checkboxes.

#### Files to Modify/Create

1. **Create component**: `app/(onboarding)/batch-tracking/components/category-checkbox-list.tsx`
2. **Update**: `screen-2-select-products.tsx` to use it

#### CategoryCheckboxList Component

**Props:**
```typescript
interface CategoryCheckboxListProps {
  categories: CategoryWithTracking[]
  selectedIds: string[]
  onToggle: (categoryId: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}
```

**Design:**
- Search input at top with Search icon
- List of categories below
- Each row: checkbox, category name, "(X products)" count
- Rows are hoverable (bg-gray-50 on hover)
- Filter list based on searchTerm (case-insensitive match on name)

**Layout:**
```
<div className="bg-white rounded-xl border border-gray-200 p-4">
  {/* Search input */}
  <div className="flex items-center gap-2 mb-4">
    <Search className="w-4 h-4 text-gray-400" />
    <input ... />
  </div>
  
  {/* Category list */}
  <div className="space-y-2">
    {filteredCategories.map(cat => (
      <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
        <Checkbox checked={...} onCheckedChange={...} />
        <span>{cat.display_name_en}</span>
        <span className="text-gray-500 text-sm">({cat.product_count} products)</span>
      </label>
    ))}
  </div>
</div>
```

#### Integration with Screen 2

Update screen-2-select-products.tsx:
```typescript
// Add local state for search
const [categorySearch, setCategorySearch] = useState('')

// In the conditional render:
{productSelection.mode === 'by_category' && categories && (
  <CategoryCheckboxList
    categories={categories}
    selectedIds={productSelection.selectedCategoryIds}
    onToggle={toggleCategorySelection}
    searchTerm={categorySearch}
    onSearchChange={setCategorySearch}
  />
)}
```

#### Validation Update
- "Next" button should be disabled if mode is 'by_category' but no categories selected
- Use canProceedFromScreen2() from store or check selectedCategoryIds.length > 0

#### Acceptance Criteria
- [ ] CategoryCheckboxList component created
- [ ] Search filters categories in real-time
- [ ] Checkboxes toggle category selection in store
- [ ] Visual feedback when category is selected
- [ ] "Next" disabled when no categories selected (in by_category mode)
- [ ] Empty state if search returns no results

---

## PHASE 3: Automation Screens (Tasks 12-14)

---

### TASK 12: Create Screen 3 - Category Automation

**Estimated Time:** 1.5 hours

#### Context
Screen 3 lets users configure automatic batch creation per category - setting default shelf life and enabling/disabling automation.

#### File to Create
`app/(onboarding)/batch-tracking/components/screen-3-category-automation.tsx`

#### Design Reference
- Header: "← Back" left, "Skip setup →" right
- Headline: "Want to automate batch creation?"
- Subtext: "Set default expiration timelines by category..."
- Info alert: "You can always adjust these later in Settings"
- Table with columns: Category | Default Shelf Life | Enabled
- Each row: icon+name+count | number input + "days" | Toggle + ON/OFF label
- ProgressIndicator (Step 3 of 5)
- Two buttons: "Skip automation" (secondary) | "Next" (primary)

#### State Management
On mount, initialize category settings from API data:
```typescript
useEffect(() => {
  if (categories && categorySettings.length === 0) {
    initializeCategorySettings(categories)
  }
}, [categories])
```

Read/write from Zustand store:
- categorySettings array
- updateCategorySettings(categoryId, { defaultShelfLifeDays, autoCreateBatches })

#### Table Row Structure
```
<div className="grid grid-cols-3 gap-4 p-4 items-center">
  {/* Column 1: Category info */}
  <div>
    <div className="flex items-center gap-2">
      <span>{getCategoryEmoji(cat.category_code)}</span>
      <span className="font-medium">{cat.categoryName}</span>
    </div>
    <div className="text-sm text-gray-500">{cat.productCount} products</div>
  </div>
  
  {/* Column 2: Shelf life input */}
  <div className="flex items-center gap-2">
    <Input
      type="number"
      value={cat.defaultShelfLifeDays || ''}
      disabled={!cat.autoCreateBatches}
      className="w-16 text-center"
    />
    <span className={!cat.autoCreateBatches ? 'text-gray-400' : ''}>days</span>
  </div>
  
  {/* Column 3: Toggle */}
  <div className="flex items-center justify-end gap-2">
    <Switch checked={cat.autoCreateBatches} onCheckedChange={...} />
    <span>{cat.autoCreateBatches ? 'ON' : 'OFF'}</span>
  </div>
</div>
```

#### Category Emoji Helper
```typescript
function getCategoryEmoji(code: string): string {
  const emojiMap: Record<string, string> = {
    'dairy': '🥛',
    'bakery': '🥖',
    'produce': '🥬',
    'beverages': '🥤',
    'dry_goods': '📦',
    // Add more as needed
  }
  return emojiMap[code] || '📦'
}
```

#### Button Behavior
- "Skip automation": Set all autoCreateBatches to false, then goToNextScreen()
- "Next": Just goToNextScreen()

#### Filtering
Only show categories that were selected in Screen 2:
- If mode is 'all': show all categories
- If mode is 'by_category': filter to selectedCategoryIds
- If mode is 'individual': derive categories from selected products (or show all)

#### Acceptance Criteria
- [ ] Table renders with category data
- [ ] Number input updates shelf life in store
- [ ] Toggle enables/disables automation per category
- [ ] Input is disabled when toggle is OFF
- [ ] "Skip automation" disables all and proceeds
- [ ] Only relevant categories shown based on Screen 2 selection

---

### TASK 13: Create ProductOverrideCard Component

**Estimated Time:** 45 min

#### Context
Screen 4 shows a list of products with override capabilities. Each product is displayed as a card with inline editing.

#### File to Create
`app/(onboarding)/batch-tracking/components/product-override-card.tsx`

#### Design Reference (3 states)

**State 1: Has automation, no override (inherited)**
- White card with gray border
- Product avatar (initials) + name + category
- Pill showing: Calendar icon + "Expires in {X} days (from category)"
- No edit indicator

**State 2: Has automation, with override (customized)**
- White card with dark border + ring
- Product avatar + name + category + Edit3 icon (top right)
- Pill with inline number input + "days"
- Reset button (RotateCcw icon) to clear override

**State 3: No automation (manual entry required)**
- White card with gray border
- Dashed border pill showing: "Manual entry required" + "Set →" button
- Clicking "Set →" enables inline editing

#### Component Interface
```typescript
interface ProductOverrideCardProps {
  product: ProductForTracking
  override: ProductOverride | undefined
  onUpdateOverride: (updates: Partial<ProductOverride>) => void
  onClearOverride: () => void
}

interface ProductOverride {
  productId: string
  shelfLifeOverrideDays: number | null
  autoCreateBatches: boolean | null
}
```

#### ProductAvatar Helper
```typescript
function ProductAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
      {initials}
    </div>
  )
}
```

#### Visual States
```typescript
// Card border
const cardClasses = cn(
  'bg-white rounded-xl border p-4',
  hasOverride ? 'border-gray-800 ring-1 ring-gray-800' : 'border-gray-200'
)

// Pill styles
const pillClasses = cn(
  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
  hasAutomation ? 'bg-gray-100' : 'bg-gray-50 border border-dashed border-gray-300'
)
```

#### Inline Edit Behavior
- When in edit mode, show number input inside pill
- Input should be small (w-12) and centered
- On blur or Enter, save the value

#### Acceptance Criteria
- [ ] Component renders all 3 states correctly
- [ ] Inherited state shows "(from category)" text
- [ ] Override state shows edit icon and reset button
- [ ] Manual entry state shows "Set →" button
- [ ] Clicking reset clears override and reverts to inherited
- [ ] Number input updates override value

---

### TASK 14: Create Screen 4 - Product Overrides

**Estimated Time:** 1.5 hours

#### Context
Screen 4 allows fine-tuning shelf life for individual products. It uses pagination and filtering.

#### File to Create
`app/(onboarding)/batch-tracking/components/screen-4-product-overrides.tsx`

#### Design Reference
- Header: "← Back" left, "Skip setup →" right
- Headline: "Fine-tune by product" + "Optional" badge (top right)
- Subtext about overriding defaults
- Search bar + Category dropdown filter
- List of ProductOverrideCard components
- "Showing X of Y products - Load more ↓" pagination
- ProgressIndicator (Step 4 of 5)
- Two buttons: "Skip this step" (secondary) | "Review setup" (primary)

#### State Management
Local state for filters:
```typescript
const [searchTerm, setSearchTerm] = useState('')
const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
const [page, setPage] = useState(0)
```

Read/write overrides from Zustand store:
- productOverrides array
- updateProductOverride(productId, updates)
- clearProductOverride(productId)

#### Data Fetching
```typescript
const debouncedSearch = useDebouncedValue(searchTerm, 300)

const { data: products, isLoading } = useProductsForTrackingSetup(storeId, {
  categoryId: categoryFilter,
  searchTerm: debouncedSearch || null,
  pageSize: 20,
  offset: page * 20,
})
```

#### useDebouncedValue Hook
Create if doesn't exist: `hooks/use-debounced-value.ts`
```typescript
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  
  return debouncedValue
}
```

#### Product List Rendering
```typescript
{products?.map(product => {
  const override = productOverrides.find(o => o.productId === product.product_id)
  return (
    <ProductOverrideCard
      key={product.product_id}
      product={product}
      override={override}
      onUpdateOverride={(updates) => updateProductOverride(product.product_id, updates)}
      onClearOverride={() => clearProductOverride(product.product_id)}
    />
  )
})}
```

#### Pagination
```typescript
const totalCount = products?.[0]?.total_count ?? 0
const loadedCount = (page + 1) * 20
const hasMore = loadedCount < totalCount

{hasMore && (
  <button onClick={() => setPage(p => p + 1)}>
    Showing {Math.min(loadedCount, totalCount)} of {totalCount} products - Load more ↓
  </button>
)}
```

#### Category Filter Dropdown
- Use a Select component from shadcn/ui
- Options: "All categories" + list from useCategoriesWithTrackingSettings
- On change, reset page to 0

#### Acceptance Criteria
- [ ] Products load with pagination
- [ ] Search filters products (debounced)
- [ ] Category dropdown filters products
- [ ] ProductOverrideCard renders for each product
- [ ] Overrides persist in Zustand store
- [ ] "Load more" loads next page
- [ ] "Skip this step" proceeds without saving overrides

---

## PHASE 4: Review & Complete (Tasks 15-18)

---

### TASK 15: Create Screen 5 - Review

**Estimated Time:** 1 hour

#### Context
Screen 5 shows a summary of everything configured and lets the user confirm or go back to edit.

#### File to Create
`app/(onboarding)/batch-tracking/components/screen-5-review.tsx`

#### Design Reference
- Header: "← Back" left, "Skip setup →" right
- Headline: "Review your batch setup"
- Subtext changes based on whether automation is enabled
- Card 1: "Setup Summary" (📊 icon)
  - Products tracked: "X of Y"
  - Auto-expiration: "X categories enabled" or "None (manual entry)"
  - Product overrides: "X products customized"
  - Manual entry: "X products (Category1, Category2)" [if applicable]
- Card 2: "How it works" (🤖 icon)
  - Step-by-step explanation (different for automation vs manual)
  - Info tip if no automation: "You can enable automation anytime in Settings"
- Card 3: "Your automation rules" [only if automation enabled]
  - Grid showing category → shelf life mappings
  - "+ X product overrides" text
  - "Edit →" button to go back to Screen 3
- ProgressIndicator (Step 5 of 5)
- Primary button: "✓ Finish setup"
- Link: "Change something? Go back"

#### Computed Values from Store
```typescript
const {
  productSelection,
  categorySettings,
  productOverrides,
  getTrackedProductCount,
  getAutomatedCategoryCount,
  getProductOverrideCount,
} = useBatchTrackingOnboardingStore()

const trackedCount = getTrackedProductCount()
const automatedCount = getAutomatedCategoryCount()
const overrideCount = getProductOverrideCount()
const hasAutomation = automatedCount > 0
```

#### Total Products (from API)
```typescript
const { data: categories } = useCategoriesWithTrackingSettings(storeId)
const totalProducts = categories?.reduce((sum, c) => sum + c.product_count, 0) ?? 0
```

#### Categories Needing Manual Entry
```typescript
const manualCategories = categorySettings
  .filter(c => !c.autoCreateBatches)
  .map(c => c.categoryName)
const manualProductCount = categorySettings
  .filter(c => !c.autoCreateBatches)
  .reduce((sum, c) => sum + c.productCount, 0)
```

#### "How it works" Steps
With automation:
1. "Scan or add products to a new batch"
2. "Expiration dates auto-fill based on your rules"
3. "Review and confirm quantities"
4. "Products without rules → you'll enter dates manually"

Without automation:
1. "Create a new batch from 'New Deliveries'"
2. "Add products and enter expiration dates"
3. "Confirm quantities and save"

#### Edit Navigation
The "Edit →" button on automation rules card should call `setCurrentScreen(3)`

#### Finish Button
Calls the save mutation (implemented in next task)

#### Acceptance Criteria
- [ ] Summary card shows accurate counts
- [ ] "How it works" adapts to automation status
- [ ] Automation rules card only shows if hasAutomation
- [ ] "Edit →" navigates back to correct screen
- [ ] Displays manual entry categories if applicable
- [ ] "Finish setup" button visible and styled

---

### TASK 16: Wire Up Save Mutation and Complete Flow

**Estimated Time:** 1 hour

#### Context
When user clicks "Finish setup" on Screen 5, we need to save everything to the database and show Screen 6.

#### Files to Modify
1. `screen-5-review.tsx` - Add save handler
2. `screen-6-success.tsx` - Display results
3. `page.tsx` - Handle dashboard navigation

#### Save Handler in Screen 5

```typescript
import { useSaveBatchTrackingSetup } from '@/lib/queries/batch-tracking-onboarding'
import { useStoreContext } from '@/lib/providers/store-provider' // or wherever you get storeId

export function Screen5Review() {
  const { currentStore } = useStoreContext()
  const saveMutation = useSaveBatchTrackingSetup()
  const { 
    productSelection, 
    categorySettings, 
    productOverrides,
    setSetupResult,
    goToNextScreen 
  } = useBatchTrackingOnboardingStore()

  const handleFinishSetup = async () => {
    try {
      const result = await saveMutation.mutateAsync({
        storeId: currentStore.store_id,
        config: {
          enabled: true,
          setup_completed: true,
          setup_completed_at: new Date().toISOString(),
          product_selection_mode: productSelection.mode,
          selected_category_ids: productSelection.selectedCategoryIds,
          selected_product_ids: productSelection.selectedProductIds,
        },
        categorySettings: categorySettings.map(c => ({
          category_id: c.categoryId,
          is_tracked: true,
          auto_create_batches: c.autoCreateBatches,
          default_shelf_life_days: c.defaultShelfLifeDays,
        })),
        productOverrides: productOverrides
          .filter(p => p.shelfLifeOverrideDays !== null || p.autoCreateBatches !== null)
          .map(p => ({
            product_id: p.productId,
            shelf_life_override_days: p.shelfLifeOverrideDays,
            auto_create_batches: p.autoCreateBatches,
          })),
      })

      setSetupResult({
        success: true,
        categoriesUpdated: result.categories_updated,
        productsUpdated: result.products_updated,
      })
      goToNextScreen() // Go to Screen 6
    } catch (error) {
      toast.error('Failed to save setup. Please try again.')
      console.error('Save error:', error)
    }
  }

  return (
    // ... existing JSX ...
    <Button 
      onClick={handleFinishSetup}
      disabled={saveMutation.isPending}
    >
      {saveMutation.isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Check className="w-4 h-4" />
          Finish setup
        </>
      )}
    </Button>
  )
}
```

#### Update Screen 6 to Show Result

```typescript
export function Screen6Success() {
  const { setupResult, resetWizard } = useBatchTrackingOnboardingStore()
  const router = useRouter()

  const handleGoToDashboard = () => {
    resetWizard() // Clear persisted state
    router.push('/dashboard')
  }

  // Can show setupResult.categoriesUpdated and productsUpdated if desired
  // But wireframe doesn't show specific numbers
}
```

#### Navigation from Page Container

Update page.tsx to handle the store context:
```typescript
import { useStoreContext } from '@/lib/providers/store-provider'

export default function BatchTrackingOnboardingPage() {
  const { currentStore, isLoading } = useStoreContext()
  
  if (isLoading || !currentStore) {
    return <LoadingState />
  }
  
  // ... rest of component
}
```

#### Error Handling
- Show toast on save failure
- Don't navigate to Screen 6 on error
- Allow user to retry

#### Acceptance Criteria
- [ ] "Finish setup" calls save mutation with correct payload
- [ ] Loading state shown during save
- [ ] On success, navigates to Screen 6
- [ ] On error, shows toast and stays on Screen 5
- [ ] Screen 6 resets wizard and navigates to dashboard
- [ ] Persisted localStorage is cleared on completion

---

### TASK 17: Add Loading and Error States

**Estimated Time:** 45 min

#### Context
We need proper loading skeletons and error states for screens that fetch data.

#### Files to Create/Modify

1. **Create** `app/(onboarding)/batch-tracking/components/loading-state.tsx`
2. **Create** `app/(onboarding)/batch-tracking/components/error-state.tsx`
3. **Update** screens 2, 3, 4 to use them

#### LoadingState Component

```typescript
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  subtext?: string
}

export function LoadingState({ 
  message = 'Loading...', 
  subtext 
}: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
      {subtext && <p className="text-sm text-gray-500">{subtext}</p>}
    </div>
  )
}
```

#### ErrorState Component

```typescript
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onContinue?: () => void
}

export function ErrorState({
  title = "Something went wrong",
  message = "We had trouble loading data. This might be temporary.",
  onRetry,
  onContinue,
}: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-6 text-center">
        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          )}
          {onContinue && (
            <Button onClick={onContinue}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

#### Update Screen 2

```typescript
export function Screen2SelectProducts() {
  const { data: categories, isLoading, error, refetch } = useCategoriesWithTrackingSettings(storeId)

  if (isLoading) {
    return <LoadingState message="Loading your products..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load products"
        message="We had trouble connecting to your store data."
        onRetry={() => refetch()}
        onContinue={() => goToNextScreen()} // Allow skipping
      />
    )
  }

  // ... rest of component
}
```

#### Update Screen 4

```typescript
export function Screen4ProductOverrides() {
  const { data: products, isLoading, error, refetch } = useProductsForTrackingSetup(...)

  // Show inline loading for pagination, not full screen
  // Show full screen error only on initial load

  if (isLoading && page === 0) {
    return <LoadingState message="Loading products..." />
  }

  if (error && page === 0) {
    return <ErrorState onRetry={() => refetch()} />
  }

  // ... rest with inline loading for "load more"
}
```

#### Empty State for Screen 2

If no categories/products exist:
```typescript
if (categories?.length === 0) {
  return (
    <div className="text-center p-8">
      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="font-medium text-gray-900 mb-2">No products yet</h3>
      <p className="text-gray-500">
        Sync your Square catalog first to start tracking batches.
      </p>
    </div>
  )
}
```

#### Acceptance Criteria
- [ ] LoadingState component created with spinner
- [ ] ErrorState component created with retry option
- [ ] Screen 2 shows loading while fetching categories
- [ ] Screen 4 shows loading while fetching products
- [ ] Errors show retry button
- [ ] Empty state handled for no products

---

### TASK 18: Final Polish and Integration Testing

**Estimated Time:** 1.5 hours

#### Context
Final task to ensure everything works together, fix any styling issues, and test the complete flow.

#### Checklist

**Navigation Flow:**
- [ ] Screen 1 → 2 → 3 → 4 → 5 → 6 works via "Next"
- [ ] Back button works on all screens
- [ ] "Skip setup" from any screen goes to dashboard
- [ ] Screen 6 "Go to Dashboard" clears state and navigates

**State Persistence:**
- [ ] Refresh page mid-wizard → resumes at correct screen
- [ ] Selections persist across screens
- [ ] Completing wizard clears localStorage

**Data Flow:**
- [ ] Screen 2: Product counts from API match selection modes
- [ ] Screen 3: Category settings initialize from API defaults
- [ ] Screen 4: Products load with correct inherited values
- [ ] Screen 5: Summary counts match actual selections

**Error Handling:**
- [ ] API failure shows error state with retry
- [ ] Save failure shows toast and stays on Screen 5
- [ ] Empty states handled gracefully

**Mobile Responsiveness:**
- [ ] All screens usable on 375px width
- [ ] Tables convert to stacked layout on mobile
- [ ] Buttons are full-width on mobile

**Visual Polish:**
- [ ] Consistent spacing using wireframe reference
- [ ] Focus states on interactive elements
- [ ] Loading spinners where appropriate
- [ ] Smooth transitions between screens

#### Manual Test Scenarios

**Scenario 1: Complete flow with automation**
1. Start on Screen 1
2. Select "By category" on Screen 2
3. Check 2 categories
4. Enable automation for 1 category on Screen 3
5. Add 1 product override on Screen 4
6. Review on Screen 5
7. Finish setup
8. Verify on dashboard

**Scenario 2: Skip automation**
1. Start on Screen 1
2. Select "All products" on Screen 2
3. Click "Skip automation" on Screen 3
4. Skip Screen 4
5. Review shows "manual entry" mode
6. Complete setup

**Scenario 3: Partial completion + resume**
1. Start wizard, get to Screen 3
2. Close browser tab
3. Return to /batch-tracking
4. Should resume at Screen 3 with previous selections

#### Fix Any Issues Found
Document and fix any bugs discovered during testing.

#### Acceptance Criteria
- [ ] All navigation flows work correctly
- [ ] State persists and clears appropriately
- [ ] Data displays correctly on all screens
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Ready for user testing

---

## Quick Reference: File Locations

### New Files to Create

```
lib/
├── stores/
│   └── batch-tracking-onboarding-store.ts     (Task 4)
├── queries/
│   └── batch-tracking-onboarding.ts           (Task 5)

hooks/
└── use-debounced-value.ts                     (Task 14)

app/(onboarding)/batch-tracking/
├── layout.tsx                                  (Task 6)
├── page.tsx                                    (Task 6)
└── components/
    ├── progress-indicator.tsx                  (Task 7)
    ├── screen-1-welcome.tsx                    (Task 8)
    ├── screen-2-select-products.tsx            (Task 10)
    ├── category-checkbox-list.tsx              (Task 11)
    ├── screen-3-category-automation.tsx        (Task 12)
    ├── product-override-card.tsx               (Task 13)
    ├── screen-4-product-overrides.tsx          (Task 14)
    ├── screen-5-review.tsx                     (Task 15)
    ├── screen-6-success.tsx                    (Task 9)
    ├── loading-state.tsx                       (Task 17)
    └── error-state.tsx                         (Task 17)
```

### Files to Modify

```
lib/queries/query-keys.ts                       (Task 5)
```

### Database Migrations (RPC Functions)

```
- get_categories_with_tracking_settings         (Task 1)
- get_products_for_tracking_setup               (Task 2)
- save_batch_tracking_setup                     (Task 3)
```

---

## Progress Tracking

Use this checklist to track your progress:

- [ ] **Task 1:** RPC - get_categories_with_tracking_settings
- [ ] **Task 2:** RPC - get_products_for_tracking_setup
- [ ] **Task 3:** RPC - save_batch_tracking_setup
- [ ] **Task 4:** Zustand store
- [ ] **Task 5:** React Query hooks
- [ ] **Task 6:** Page container + folder structure
- [ ] **Task 7:** ProgressIndicator component
- [ ] **Task 8:** Screen 1 (Welcome)
- [ ] **Task 9:** Screen 6 (Success)
- [ ] **Task 10:** Screen 2 - Radio cards
- [ ] **Task 11:** Screen 2 - Category list
- [ ] **Task 12:** Screen 3 (Category Automation)
- [ ] **Task 13:** ProductOverrideCard component
- [ ] **Task 14:** Screen 4 (Product Overrides)
- [ ] **Task 15:** Screen 5 (Review)
- [ ] **Task 16:** Save mutation + complete flow
- [ ] **Task 17:** Loading/Error states
- [ ] **Task 18:** Final polish + testing

---

*Document generated: February 3, 2026*