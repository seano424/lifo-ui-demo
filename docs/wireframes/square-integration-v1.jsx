'use client'

import { useState } from 'react'

/*
 * ─────────────────────────────────────────────────────────
 *  LIFO — Square Integration Wireframe (Grayscale)
 *
 *  DESIGN DECISIONS & RATIONALE (for Claude Code handoff):
 *
 *  1. TWO-COLUMN LAYOUT (Stripe-inspired)
 *     Left: Store list with inline actions
 *     Right: Summary panel that contextualizes the data
 *     → Gives users overview + detail simultaneously
 *
 *  2. STORE CARDS show sync health
 *     Each store shows: product count, category count,
 *     last sync timestamp, and connection status indicator
 *     → Current design hides operational context
 *
 *  3. GLOBAL TOTALS moved to summary panel
 *     Instead of floating at the bottom, totals live in
 *     a persistent right column with next-step CTA
 *     → Stripe pattern: form left, preview right
 *
 *  4. PER-STORE ACTIONS inline
 *     Sync, disconnect, and view details are per-store
 *     → Current design has no per-store actions
 *
 *  5. CONNECTION STATUS is always visible
 *     Green dot = healthy, amber = stale, red = error
 *     → Users need sync confidence at a glance
 * ─────────────────────────────────────────────────────────
 */

// ─── Icons (inline SVG, no deps) ─────────────────────────

const Icon = {
  store: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  refresh: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  ),
  link: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  unlink: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="m5.16 11.75-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71" />
      <line
        x1="2"
        y1="2"
        x2="22"
        y2="22"
      />
    </svg>
  ),
  box: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line
        x1="12"
        y1="22.08"
        x2="12"
        y2="12"
      />
    </svg>
  ),
  grid: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
      />
    </svg>
  ),
  arrowRight: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
      />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  check: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  chevronDown: (cls) => (
    <svg
      className={cls}
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
  chevronUp: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  ),
  externalLink: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line
        x1="10"
        y1="14"
        x2="21"
        y2="3"
      />
    </svg>
  ),
  info: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <line
        x1="12"
        y1="16"
        x2="12"
        y2="12"
      />
      <line
        x1="12"
        y1="8"
        x2="12.01"
        y2="8"
      />
    </svg>
  ),
  clock: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
      />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  squareLogo: (cls) => (
    <svg
      className={cls}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4"
      />
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="1"
        fill="white"
      />
    </svg>
  ),
}

// ─── Mock Data ────────────────────────────────────────────

const STORES = [
  {
    id: 'store-1',
    name: 'LIFO App Number 2',
    squareId: 'LQ7X...4R2M',
    products: 4,
    categories: 1,
    status: 'connected',
    lastSync: '2 min ago',
    syncHealth: 'healthy',
  },
  {
    id: 'store-2',
    name: 'LIFO App',
    squareId: 'MK3P...8N1J',
    products: 0,
    categories: 0,
    status: 'connected',
    lastSync: 'Just now',
    syncHealth: 'empty',
  },
]

const CATALOG_TOTALS = {
  products: 35,
  categories: 9,
  lastFullSync: 'Today at 14:32',
  syncedStores: 2,
  totalStores: 2,
}

// ─── Components ───────────────────────────────────────────

function StatusDot({ health }) {
  const styles = {
    healthy: 'bg-gray-900',
    empty: 'bg-gray-400',
    stale: 'bg-gray-500',
    error: 'bg-gray-300 ring-2 ring-gray-400',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${styles[health] || styles.healthy}`}
    />
  )
}

function StoreCard({ store, isExpanded, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
      {/* Store header — always visible */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
            {Icon.store('w-4.5 h-4.5 text-gray-600')}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {store.name}
              </span>
              <StatusDot health={store.syncHealth} />
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {store.squareId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Inline stats — visible even when collapsed */}
          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              {Icon.box('w-3.5 h-3.5 text-gray-400')}
              {store.products} products
            </span>
            <span className="flex items-center gap-1.5">
              {Icon.grid('w-3.5 h-3.5 text-gray-400')}
              {store.categories} categories
            </span>
          </div>
          {isExpanded
            ? Icon.chevronUp('w-4 h-4 text-gray-400')
            : Icon.chevronDown('w-4 h-4 text-gray-400')}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
            <div className="px-5 py-3.5">
              <div className="text-xl font-bold text-gray-900">
                {store.products}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Products</div>
            </div>
            <div className="px-5 py-3.5">
              <div className="text-xl font-bold text-gray-900">
                {store.categories}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Categories</div>
            </div>
            <div className="px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                <StatusDot health={store.syncHealth} />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {store.syncHealth === 'empty' ? 'No data' : store.syncHealth}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Sync status</div>
            </div>
            <div className="px-5 py-3.5">
              <div className="flex items-center gap-1.5">
                {Icon.clock('w-3.5 h-3.5 text-gray-400')}
                <span className="text-sm font-medium text-gray-700">
                  {store.lastSync}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Last synced</div>
            </div>
          </div>

          {/* Actions bar */}
          <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {Icon.refresh('w-3.5 h-3.5')}
                Sync now
              </button>
              <button className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                {Icon.externalLink('w-3.5 h-3.5')}
                View in Square
              </button>
            </div>
            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              {Icon.unlink('w-3.5 h-3.5')}
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryPanel({ totals, storeCount }) {
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden sticky top-8">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Import Summary</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Overview of your Square catalog sync
        </p>
      </div>

      {/* Timeline / progress indicator */}
      <div className="px-5 py-4 space-y-4">
        {/* Step 1: Connected */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
              {Icon.check('w-3 h-3 text-white')}
            </div>
            <div className="w-px h-6 bg-gray-200 mt-1" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              Square connected
            </div>
            <div className="text-xs text-gray-400">
              {totals.syncedStores} of {totals.totalStores} stores synced
            </div>
          </div>
        </div>

        {/* Step 2: Catalog imported */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex flex-col items-center">
            <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center">
              {Icon.check('w-3 h-3 text-white')}
            </div>
            <div className="w-px h-6 bg-gray-200 mt-1" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">
              Catalog imported
            </div>
            <div className="text-xs text-gray-400">
              {totals.products} products, {totals.categories} categories
            </div>
          </div>
        </div>

        {/* Step 3: Batch tracking (next) */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-400">3</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">
              Set up batch tracking
            </div>
            <div className="text-xs text-gray-400">
              Configure expiry date rules for your products
            </div>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-100 px-5 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {totals.products}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Total products</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {totals.categories}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Categories</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          {Icon.clock('w-3 h-3')}
          Last full sync: {totals.lastFullSync}
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-gray-100 p-4">
        <button className="w-full bg-gray-900 text-white text-sm font-semibold py-3 px-4 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
          Continue to Batch Tracking
          {Icon.arrowRight('w-4 h-4')}
        </button>
        <p className="text-[11px] text-gray-400 text-center mt-2.5">
          You can always come back to manage your Square connection
        </p>
      </div>
    </div>
  )
}

function ConnectionBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200">
      <StatusDot health="healthy" />
      <span className="text-xs font-medium text-gray-600">Connected</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────

export default function SquareIntegrationWireframe() {
  const [expandedStore, setExpandedStore] = useState('store-1')

  const toggleStore = (id) => {
    setExpandedStore(expandedStore === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ── Page Header ── */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <span className="hover:text-gray-600 cursor-pointer transition-colors">
              Settings
            </span>
            <span>/</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">
              Integrations
            </span>
            <span>/</span>
            <span className="text-gray-600 font-medium">Square</span>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Square logo placeholder */}
              <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
                {Icon.squareLogo('w-7 h-7 text-white')}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">Square</h1>
                  <ConnectionBadge />
                </div>
                <p className="text-sm text-gray-400 mt-0.5">
                  Product catalog and category sync
                </p>
              </div>
            </div>

            <button className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all">
              {Icon.refresh('w-3.5 h-3.5')}
              Sync all stores
            </button>
          </div>
        </div>

        {/* ── Two Column Layout (Stripe-inspired) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Store list */}
          <div className="lg:col-span-2 space-y-5">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Your Stores
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {STORES.length} stores connected from Square
                </p>
              </div>
            </div>

            {/* Store cards */}
            <div className="space-y-3">
              {STORES.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isExpanded={expandedStore === store.id}
                  onToggle={() => toggleStore(store.id)}
                />
              ))}
            </div>

            {/* Help text */}
            <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4">
              <div className="mt-0.5">{Icon.info('w-4 h-4 text-gray-400')}</div>
              <div>
                <p className="text-sm text-gray-600">
                  Products and categories are imported from your Square catalog.
                  LIFO adds batch-level expiry tracking on top of your existing
                  product data.
                </p>
                <button className="text-xs font-medium text-gray-500 hover:text-gray-900 mt-2 transition-colors">
                  Learn more about Square sync →
                </button>
              </div>
            </div>
          </div>

          {/* Right: Summary panel */}
          <div>
            <SummaryPanel
              totals={CATALOG_TOTALS}
              storeCount={STORES.length}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
