'use client'

import { useState } from 'react'

// ——— Inline SVG Icons ———————————————————————————————
const I = {
  check: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  chevronDown: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  plus: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  x: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  search: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  layers: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  zap: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  bell: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  sliders: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  calendar: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  edit: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  info: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  sparkle: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
    </svg>
  ),
  clock: c => (
    <svg
      className={c}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
}

// ——— Mock Data ———————————————————————————————————————

const CATEGORIES = [
  { id: 'dairy', name: 'Dairy & Eggs', count: 24, enabled: true },
  { id: 'bakery', name: 'Bakery', count: 18, enabled: true },
  { id: 'produce', name: 'Fresh Produce', count: 31, enabled: false },
  { id: 'meat', name: 'Meat & Seafood', count: 15, enabled: false },
  { id: 'beverages', name: 'Beverages', count: 22, enabled: true },
  { id: 'snacks', name: 'Snacks & Confectionery', count: 19, enabled: false },
  { id: 'canned', name: 'Canned Goods', count: 12, enabled: false },
  { id: 'frozen', name: 'Frozen Foods', count: 8, enabled: false },
]

const CATEGORY_SHELF_LIFE = [
  { id: 'dairy', name: 'Dairy & Eggs', defaultDays: 7, enabled: true },
  { id: 'bakery', name: 'Bakery', defaultDays: 3, enabled: true },
  { id: 'produce', name: 'Fresh Produce', defaultDays: 5, enabled: false },
  { id: 'meat', name: 'Meat & Seafood', defaultDays: 4, enabled: false },
  { id: 'beverages', name: 'Beverages', defaultDays: 14, enabled: false },
  {
    id: 'snacks',
    name: 'Snacks & Confectionery',
    defaultDays: 30,
    enabled: false,
  },
  { id: 'canned', name: 'Canned Goods', defaultDays: 365, enabled: false },
  { id: 'frozen', name: 'Frozen Foods', defaultDays: 90, enabled: false },
]

const PRODUCTS = [
  {
    id: 1,
    name: 'Organic Whole Milk 1L',
    category: 'Dairy & Eggs',
    barcode: '8710400000112',
    tracked: true,
  },
  {
    id: 2,
    name: 'Free Range Eggs 12pk',
    category: 'Dairy & Eggs',
    barcode: '8710400000129',
    tracked: true,
  },
  {
    id: 3,
    name: 'Sourdough Bread 400g',
    category: 'Bakery',
    barcode: '8710400000136',
    tracked: true,
  },
  {
    id: 4,
    name: 'Greek Yogurt 500g',
    category: 'Dairy & Eggs',
    barcode: '8710400000143',
    tracked: true,
  },
  {
    id: 5,
    name: 'Fresh Orange Juice 1L',
    category: 'Beverages',
    barcode: '8710400000150',
    tracked: false,
  },
  {
    id: 6,
    name: 'Sliced Ham 200g',
    category: 'Meat & Seafood',
    barcode: '8710400000167',
    tracked: false,
  },
  {
    id: 7,
    name: 'Croissants 4pk',
    category: 'Bakery',
    barcode: '8710400000174',
    tracked: true,
  },
  {
    id: 8,
    name: 'Butter Unsalted 250g',
    category: 'Dairy & Eggs',
    barcode: '8710400000181',
    tracked: true,
  },
]

const PRODUCT_SHELF_LIFE = [
  {
    id: 1,
    name: 'Organic Whole Milk 1L',
    category: 'Dairy & Eggs',
    shelfDays: 5,
  },
  { id: 2, name: 'Croissants 4pk', category: 'Bakery', shelfDays: 2 },
]

const OVERRIDES = [
  {
    id: 1,
    product: 'Organic Whole Milk 1L',
    category: 'Dairy & Eggs',
    defaultDays: 7,
    overrideDays: 5,
    reason: 'Sells slower',
  },
  {
    id: 2,
    product: 'Croissants 4pk',
    category: 'Bakery',
    defaultDays: 3,
    overrideDays: 1,
    reason: 'Very short shelf life',
  },
  {
    id: 3,
    product: 'Greek Yogurt 500g',
    category: 'Dairy & Eggs',
    defaultDays: 7,
    overrideDays: 10,
    reason: 'Longer actual shelf life',
  },
]

const NOTIFICATION_RULES = [
  {
    id: 1,
    name: 'Dairy & Eggs',
    type: 'category',
    threshold: 5,
    action: 'discount',
    status: true,
    products: 24,
  },
  {
    id: 2,
    name: 'Bakery',
    type: 'category',
    threshold: 2,
    action: 'donate',
    status: true,
    products: 18,
  },
  {
    id: 3,
    name: 'Sourdough Bread 400g',
    type: 'product',
    threshold: 3,
    action: 'discount',
    status: false,
    products: 1,
  },
]

// ——— Shared UI Components ————————————————————————————

function Toggle({ enabled, onChange, size = 'default' }) {
  const dims = size === 'small' ? { w: 32, h: 18, dot: 14 } : { w: 40, h: 22, dot: 18 }
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative rounded-full transition-colors duration-200 ${
        enabled ? 'bg-gray-900' : 'bg-gray-200'
      }`}
      style={{ width: dims.w, height: dims.h }}
    >
      <div
        className="absolute bg-white rounded-full shadow-sm transition-transform duration-200"
        style={{
          width: dims.dot,
          height: dims.dot,
          top: 2,
          transform: enabled ? `translateX(${dims.w - dims.dot - 2}px)` : 'translateX(2px)',
        }}
      />
    </button>
  )
}

function RadioOption({ selected, onSelect, label, description, children }) {
  return (
    <div
      onClick={onSelect}
      className={`border rounded-xl p-4 cursor-pointer transition-all duration-200 ${
        selected
          ? 'border-gray-900 bg-gray-50 ring-1 ring-gray-900'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected ? 'border-gray-900' : 'border-gray-300'
          }`}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-gray-900" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900">{label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{description}</div>
          {selected && children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  subtitle,
  badge,
  comingSoon,
  children,
  defaultOpen = true,
  standalone = false,
}) {
  const [open, setOpen] = useState(defaultOpen)

  // When standalone (for wizard use), always show content
  const showContent = standalone || open

  return (
    <div
      className={`bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden ${comingSoon ? 'opacity-60' : ''}`}
    >
      <button
        type="button"
        onClick={() => !standalone && setOpen(!open)}
        className={`w-full px-6 py-4 flex items-center gap-4 transition-colors ${!standalone ? 'hover:bg-gray-50/50' : ''}`}
        disabled={standalone}
      >
        <div className="bg-gray-100 p-2 rounded-xl shrink-0">
          {I[icon]('w-4.5 h-4.5 text-gray-600')}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {badge && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {badge}
              </span>
            )}
            {comingSoon && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-900 text-white">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {!standalone && (
          <div className={`transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`}>
            {I.chevronDown('w-4 h-4 text-gray-400')}
          </div>
        )}
      </button>
      {showContent && <div className="border-t border-gray-100">{children}</div>}
    </div>
  )
}

function EmptyState({ icon, title, description, action, onAction }) {
  return (
    <div className="py-8 px-6 text-center">
      <div className="bg-gray-100 p-3 rounded-2xl inline-flex mb-3">
        {I[icon]('w-5 h-5 text-gray-400')}
      </div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">{description}</p>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 text-sm font-medium text-gray-900 hover:text-gray-700 inline-flex items-center gap-1.5 transition-colors"
        >
          {I.plus('w-3.5 h-3.5')}
          {action}
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: CHOOSE WHAT TO TRACK
// ═══════════════════════════════════════════════════════════════

export function ChooseWhatToTrackSection({
  scope,
  setScope,
  categories,
  setCategories,
  products,
  setProducts,
  standalone = false,
}) {
  const [productSearch, setProductSearch] = useState('')
  const enabledCount = categories.filter(c => c.enabled).length
  const trackedCount = products.filter(p => p.tracked).length

  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase()),
  )

  const toggleCategory = id => {
    setCategories(categories.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c)))
  }

  const toggleProduct = id => {
    setProducts(products.map(p => (p.id === id ? { ...p, tracked: !p.tracked } : p)))
  }

  return (
    <SectionCard
      icon="layers"
      title="Choose What to Track"
      subtitle="What products would you like to manage with batch-level expiry tracking?"
      badge={
        scope === 'all'
          ? `${products.length} products`
          : scope === 'category'
            ? `${enabledCount} categories`
            : `${trackedCount} products`
      }
      standalone={standalone}
    >
      <div className="p-6 space-y-3">
        <RadioOption
          selected={scope === 'all'}
          onSelect={() => setScope('all')}
          label="All products"
          description={`Track all ${products.length} products in your catalog. Recommended for getting started quickly.`}
        />

        <RadioOption
          selected={scope === 'category'}
          onSelect={() => setScope('category')}
          label="Select by category"
          description="Choose specific categories to track. Ideal for focusing on high-waste areas first."
        >
          <div className="space-y-1.5 max-h-52 overflow-y-auto" onClick={e => e.stopPropagation()}>
            {categories.map(cat => (
              <label
                key={cat.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      cat.enabled
                        ? 'bg-gray-900 border-gray-900'
                        : 'border-gray-300 group-hover:border-gray-400'
                    }`}
                  >
                    {cat.enabled && I.check('w-2.5 h-2.5 text-white')}
                  </div>
                  <span className="text-sm text-gray-700">{cat.name}</span>
                </div>
                <span className="text-xs text-gray-400">{cat.count} items</span>
              </label>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {enabledCount} of {categories.length} categories selected
            </span>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setCategories(categories.map(c => ({ ...c, enabled: true })))
              }}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Select all
            </button>
          </div>
        </RadioOption>

        <RadioOption
          selected={scope === 'individual'}
          onSelect={() => setScope('individual')}
          label="Select individual products"
          description="Hand-pick specific products. Best for small or targeted tracking setups."
        >
          <div onClick={e => e.stopPropagation()}>
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {I.search('w-3.5 h-3.5 text-gray-400')}
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              {filteredProducts.map(product => (
                <label
                  key={product.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => toggleProduct(product.id)}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        product.tracked
                          ? 'bg-gray-900 border-gray-900'
                          : 'border-gray-300 group-hover:border-gray-400'
                      }`}
                    >
                      {product.tracked && I.check('w-2.5 h-2.5 text-white')}
                    </div>
                    <div>
                      <span className="text-sm text-gray-700">{product.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{product.category}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {trackedCount} of {products.length} products selected
              </span>
            </div>
          </div>
        </RadioOption>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: BATCH AUTOMATION (Shelf Life Presets)
// ═══════════════════════════════════════════════════════════════

export function BatchAutomationSection({
  automationMode,
  setAutomationMode,
  categoryShelfLife,
  setCategoryShelfLife,
  productShelfLife,
  setProductShelfLife,
  allProducts,
  standalone = false,
}) {
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newProductId, setNewProductId] = useState('')
  const [newProductDays, setNewProductDays] = useState(7)

  const enabledCategories = categoryShelfLife.filter(c => c.enabled).length

  const toggleCategoryEnabled = id => {
    setCategoryShelfLife(
      categoryShelfLife.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    )
  }

  const updateCategoryDays = (id, days) => {
    setCategoryShelfLife(
      categoryShelfLife.map(c =>
        c.id === id ? { ...c, defaultDays: parseInt(days, 10) || 0 } : c,
      ),
    )
  }

  const addProductShelfLife = () => {
    if (!newProductId) return
    const product = allProducts.find(p => p.id === parseInt(newProductId, 10))
    if (!product) return
    setProductShelfLife([
      ...productShelfLife,
      {
        id: product.id,
        name: product.name,
        category: product.category,
        shelfDays: newProductDays,
      },
    ])
    setShowAddProduct(false)
    setNewProductId('')
    setNewProductDays(7)
  }

  const removeProductShelfLife = id => {
    setProductShelfLife(productShelfLife.filter(p => p.id !== id))
  }

  const availableProducts = allProducts.filter(p => !productShelfLife.find(ps => ps.id === p.id))

  return (
    <SectionCard
      icon="calendar"
      title="Batch Automation"
      subtitle="Want to automate batch creation? Set default shelf life timelines."
      badge={
        automationMode === 'category'
          ? `${enabledCategories} categories`
          : automationMode === 'product'
            ? `${productShelfLife.length} products`
            : null
      }
      standalone={standalone}
    >
      <div className="p-6">
        {/* Intro text */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600">
            Set default expiration timelines by category or product. When inventory arrives,Lifo
            will calculate the expiry date automatically based on these presets.
          </p>
        </div>

        <div className="space-y-3">
          {/* Option: No automation */}
          <RadioOption
            selected={automationMode === 'none'}
            onSelect={() => setAutomationMode('none')}
            label="Manual entry only"
            description="Enter expiration dates manually for each batch. Full control, no assumptions."
          />

          {/* Option: By category */}
          <RadioOption
            selected={automationMode === 'category'}
            onSelect={() => setAutomationMode('category')}
            label="Automate by category"
            description="Set default shelf life for entire categories. Quick setup for most products."
          >
            <div className="space-y-2 max-h-64 overflow-y-auto" onClick={e => e.stopPropagation()}>
              {categoryShelfLife.map(cat => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors ${
                    cat.enabled ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Toggle
                      enabled={cat.enabled}
                      onChange={() => toggleCategoryEnabled(cat.id)}
                      size="small"
                    />
                    <span
                      className={`text-sm ${cat.enabled ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
                    >
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={cat.defaultDays}
                      onChange={e => updateCategoryDays(cat.id, e.target.value)}
                      disabled={!cat.enabled}
                      className={`w-16 text-sm text-right px-2 py-1 border rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                        cat.enabled
                          ? 'bg-white border-gray-200 text-gray-900'
                          : 'bg-gray-50 border-gray-100 text-gray-400'
                      }`}
                    />
                    <span className={`text-xs ${cat.enabled ? 'text-gray-500' : 'text-gray-400'}`}>
                      days
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {enabledCategories} of {categoryShelfLife.length} categories enabled
              </span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  setCategoryShelfLife(categoryShelfLife.map(c => ({ ...c, enabled: true })))
                }}
                className="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Enable all
              </button>
            </div>
          </RadioOption>

          {/* Option: By product */}
          <RadioOption
            selected={automationMode === 'product'}
            onSelect={() => setAutomationMode('product')}
            label="Automate by individual product"
            description="Set shelf life for specific products. Most precise, but requires more setup."
          >
            <div onClick={e => e.stopPropagation()}>
              {productShelfLife.length === 0 && !showAddProduct ? (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-400 mb-2">No products configured yet</p>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(true)}
                    className="text-sm font-medium text-gray-900 hover:text-gray-700 inline-flex items-center gap-1.5 transition-colors"
                  >
                    {I.plus('w-3.5 h-3.5')}
                    Add product
                  </button>
                </div>
              ) : (
                <>
                  {/* Product list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {productShelfLife.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between py-2 px-3 bg-gray-100 rounded-lg group"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">{p.name}</span>
                          <span className="text-xs text-gray-400 ml-2">{p.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">
                            {p.shelfDays} days
                          </span>
                          <button
                            type="button"
                            onClick={() => removeProductShelfLife(p.id)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            {I.x('w-3.5 h-3.5')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add product form */}
                  {showAddProduct ? (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">
                            Product
                          </label>
                          <select
                            value={newProductId}
                            onChange={e => setNewProductId(e.target.value)}
                            className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                          >
                            <option value="">Select a product...</option>
                            {availableProducts.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">
                            Shelf life
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={newProductDays}
                              onChange={e => setNewProductDays(parseInt(e.target.value, 10) || 0)}
                              className="w-full text-sm px-2 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addProductShelfLife}
                          disabled={!newProductId}
                          className="px-3 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddProduct(false)}
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {I.x('w-4 h-4')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowAddProduct(true)}
                        className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1.5 transition-colors"
                      >
                        {I.plus('w-3.5 h-3.5')}
                        Add product
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </RadioOption>
        </div>
      </div>
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: NOTIFICATION RULES (Future Feature)
// ═══════════════════════════════════════════════════════════════

// export function NotificationRulesSection({ standalone = false }) {
//   return (
//     <SectionCard
//       icon="bell"
//       title="Notification Rules"
//       subtitle="Get notifications when batches are approaching expiry"
//       comingSoon
//       defaultOpen={false}
//       standalone={standalone}
//     >
//       <div className="p-6">
//         <div className="bg-gray-50 rounded-xl p-4 text-center">
//           <div className="bg-gray-100 p-3 rounded-2xl inline-flex mb-3">
//             {I.bell('w-5 h-5 text-gray-400')}
//           </div>
//           <p className="text-sm font-medium text-gray-600">
//             Notification rules are coming soon
//           </p>
//           <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
//             Configure automatic alerts when products reach a certain number of
//             days before expiry. Get discount or donation recommendations at the
//             right time.
//           </p>
//         </div>
//       </div>
//     </SectionCard>
//   )
// }

// ═══════════════════════════════════════════════════════════════
// SECTION 4: PRODUCT OVERRIDES
// ═══════════════════════════════════════════════════════════════

export function ProductOverridesSection({ overrides, standalone = false }) {
  return (
    <SectionCard
      icon="sliders"
      title="Product Overrides"
      subtitle="Override category-level defaults for specific products"
      badge={overrides.length > 0 ? `${overrides.length} custom` : null}
      defaultOpen={false}
      standalone={standalone}
    >
      {overrides.length === 0 ? (
        <EmptyState
          icon="sliders"
          title="No product overrides"
          description="All products are using their category's default settings. Add overrides for products that need different shelf life timing."
          action="Add override"
        />
      ) : (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Category Default</th>
                  <th className="px-6 py-3">Override</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {overrides.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-gray-900">{o.product}</div>
                      <div className="text-xs text-gray-400">{o.category}</div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-gray-400 line-through">
                        {o.defaultDays} days
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm font-semibold text-gray-900">
                        {o.overrideDays} days
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-gray-400 italic">{o.reason}</span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          {I.edit('w-3.5 h-3.5')}
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          {I.trash('w-3.5 h-3.5')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-gray-100">
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1.5 transition-colors"
            >
              {I.plus('w-3.5 h-3.5')}
              Add override
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// FIRST-RUN BANNER
// ═══════════════════════════════════════════════════════════════

function FirstRunBanner({ scopeDone, automationDone, onDismiss }) {
  const completedCount = [scopeDone, automationDone].filter(Boolean).length

  return (
    <div className="bg-gray-900 text-white rounded-2xl px-6 py-5 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="bg-white/10 p-2.5 rounded-xl mt-0.5">{I.sparkle('w-5 h-5')}</div>
          <div>
            <h2 className="text-base font-semibold">Set up batch tracking</h2>
            <p className="text-sm text-gray-400 mt-1">
              Configure howLifo tracks your inventory. This usually takes about 2 minutes.
            </p>
            <div className="flex items-center gap-6 mt-4">
              <ChecklistItemDark done={scopeDone} label="Choose what to track" />
              <ChecklistItemDark done={automationDone} label="Set up automation" optional />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-32 bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / 2) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{completedCount} of 2</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-500 hover:text-white transition-colors p-1 shrink-0"
        >
          {I.x('w-4 h-4')}
        </button>
      </div>
    </div>
  )
}

function ChecklistItemDark({ done, label, optional }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
          done ? 'bg-white' : 'border border-gray-600'
        }`}
      >
        {done && I.check('w-2.5 h-2.5 text-gray-900')}
      </div>
      <span className={`text-xs ${done ? 'text-gray-300' : 'text-gray-400'}`}>
        {label}
        {optional && !done && <span className="text-gray-600 ml-1">· optional</span>}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Notification Rules Section
// ═══════════════════════════════════════════════════════════════

function NotificationRulesSection({ rules, setRules, showAddForm, setShowAddForm }) {
  const activeCount = rules.filter(r => r.status).length

  const toggleRule = id => {
    setRules(rules.map(r => (r.id === id ? { ...r, status: !r.status } : r)))
  }

  const deleteRule = id => {
    setRules(rules.filter(r => r.id !== id))
  }

  return (
    <SectionCard
      icon="zap"
      title="Notification Rules"
      subtitle="Get notifications when batches are approaching expiry"
      badge={activeCount > 0 ? `${activeCount} active` : null}
    >
      <div className="p-6">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="bg-gray-100 p-3 rounded-2xl inline-flex mb-3">
            {I.bell('w-5 h-5 text-gray-400')}
          </div>
          <p className="text-sm font-medium text-gray-600">Notification rules are coming soon</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Configure automatic alerts when products reach a certain number of days before expiry.
            Get discount or donation recommendations at the right time.
          </p>
        </div>
      </div>

      {rules.length === 0 && !showAddForm ? (
        <EmptyState
          icon="zap"
          title="No notification rules yet"
          description="LIFO will notify you manually for each expiring batch. Add rules to automate discount and donation recommendations."
          action="Add first notification rule"
          onAction={() => setShowAddForm(true)}
        />
      ) : (
        <div className="opacity-50 border border-gray-100 rounded-xl p-4">
          <div className="divide-y divide-gray-50">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Toggle enabled={rule.status} onChange={() => toggleRule(rule.id)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${rule.status ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        {rule.name}
                      </span>
                      <span className="text-xs text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">
                        {rule.type}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      When ≤ {rule.threshold} days left → suggest {rule.action}
                      {rule.type === 'category' && ` · ${rule.products} products`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    {I.edit('w-3.5 h-3.5')}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteRule(rule.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                  >
                    {I.trash('w-3.5 h-3.5')}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAddForm && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">New automation rule</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {I.x('w-4 h-4')}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Apply to</label>
                  <select className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900">
                    <option>Dairy & Eggs</option>
                    <option>Bakery</option>
                    <option>Fresh Produce</option>
                    <option>Meat & Seafood</option>
                    <option>Beverages</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    Days before expiry
                  </label>
                  <input
                    type="number"
                    defaultValue={3}
                    className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Action</label>
                  <select className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900">
                    <option>Suggest discount</option>
                    <option>Suggest donation</option>
                    <option>Alert only</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-sm px-3 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-sm font-medium px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Add rule
                </button>
              </div>
            </div>
          )}

          {!showAddForm && (
            <div className="px-6 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center gap-1.5 transition-colors"
              >
                {I.plus('w-3.5 h-3.5')}
                Add rule
              </button>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ═══════════════════════════════════════════════════════════════
// SAVE FOOTER
// ═══════════════════════════════════════════════════════════════

function SaveFooter({ isDirty, isFirstRun, onSave, onDiscard }) {
  if (!isDirty && !isFirstRun) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isDirty && !isFirstRun && (
            <>
              <div className="w-2 h-2 rounded-full bg-gray-900 animate-pulse" />
              <span className="text-sm text-gray-600">Unsaved changes</span>
            </>
          )}
          {isFirstRun && (
            <>
              {I.info('w-4 h-4 text-gray-400')}
              <span className="text-sm text-gray-600">
                Configure your settings and activate when ready
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isDirty && !isFirstRun && (
            <button
              type="button"
              onClick={onDiscard}
              className="text-sm px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            className="text-sm font-semibold px-5 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            {isFirstRun ? 'Activate Tracking' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function LifoSetupWireframeV2() {
  // Mode toggle for demo
  const [isFirstRun, setIsFirstRun] = useState(true)
  const [showFirstRunBanner, setShowFirstRunBanner] = useState(true)

  // Section 1: Choose What to Track
  const [scope, setScope] = useState('all')
  const [categories, setCategories] = useState(CATEGORIES)
  const [products, setProducts] = useState(PRODUCTS)

  const [rules, setRules] = useState(NOTIFICATION_RULES)
  const [showAddForm, setShowAddForm] = useState(false)

  // Section 2: Batch Automation
  const [automationMode, setAutomationMode] = useState('category')
  const [categoryShelfLife, setCategoryShelfLife] = useState(CATEGORY_SHELF_LIFE)
  const [productShelfLife, setProductShelfLife] = useState(PRODUCT_SHELF_LIFE)

  // Section 4: Overrides
  const [overrides] = useState(OVERRIDES)

  // Dirty state
  const [isDirty, setIsDirty] = useState(false)

  // Completion tracking
  const scopeDone = scope !== null
  const automationDone = automationMode !== 'none'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo mode toggle */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Wireframe v2
            </span>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsFirstRun(true)
                  setShowFirstRunBanner(true)
                }}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                  isFirstRun ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                First Run
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFirstRun(false)
                  setShowFirstRunBanner(false)
                }}
                className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                  !isFirstRun ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Return Visit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-3xl mx-auto px-6 py-8 pb-24">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {isFirstRun ? 'Batch Tracking Setup' : 'Batch Tracking Settings'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {isFirstRun
              ? 'Configure howLifo tracks your inventory and automates batch creation.'
              : 'Manage your tracking preferences and automation settings.'}
          </p>
        </div>

        {/* First-run banner */}
        {isFirstRun && showFirstRunBanner && (
          <FirstRunBanner
            scopeDone={scopeDone}
            automationDone={automationDone}
            onDismiss={() => setShowFirstRunBanner(false)}
          />
        )}

        {/* Sections */}
        <div className="space-y-4">
          {/* Section 1: Choose What to Track */}
          <ChooseWhatToTrackSection
            scope={scope}
            setScope={s => {
              setScope(s)
              setIsDirty(true)
            }}
            categories={categories}
            setCategories={c => {
              setCategories(c)
              setIsDirty(true)
            }}
            products={products}
            setProducts={p => {
              setProducts(p)
              setIsDirty(true)
            }}
          />

          {/* Section 2: Batch Automation */}
          <BatchAutomationSection
            automationMode={automationMode}
            setAutomationMode={m => {
              setAutomationMode(m)
              setIsDirty(true)
            }}
            categoryShelfLife={categoryShelfLife}
            setCategoryShelfLife={c => {
              setCategoryShelfLife(c)
              setIsDirty(true)
            }}
            productShelfLife={productShelfLife}
            setProductShelfLife={p => {
              setProductShelfLife(p)
              setIsDirty(true)
            }}
            allProducts={products}
          />

          {/* Section 3: Notification Rules (Coming Soon) */}
          {/* <NotificationRulesSection /> */}

          <NotificationRulesSection
            rules={rules}
            setRules={newRules => {
              setRules(newRules)
              setIsDirty(true)
            }}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
          />

          {/* Section 4: Product Overrides */}
          <ProductOverridesSection overrides={overrides} />
        </div>

        {/* First-run help text */}
        {isFirstRun && (
          <div className="mt-6 bg-gray-50 border border-gray-200 border-dashed rounded-2xl p-5">
            <div className="flex items-start gap-3">
              {I.info('w-4 h-4 text-gray-400 mt-0.5 shrink-0')}
              <div>
                <p className="text-sm font-medium text-gray-600">
                  You can always change these later
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  These settings live at{' '}
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                    /dashboard/settings
                  </span>{' '}
                  and can be edited anytime.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save footer */}
      <SaveFooter
        isDirty={isDirty || isFirstRun}
        isFirstRun={isFirstRun}
        onSave={() => setIsDirty(false)}
        onDiscard={() => setIsDirty(false)}
      />
    </div>
  )
}
