'use client'

import { useState, useEffect, useRef } from 'react'

// ——— Mock Data ———
const PRODUCT = {
  name: 'Organic Whole Milk 1L',
  sku: 'DAIRY-042',
  category: 'Dairy & Eggs',
  brand: 'Horizon Organic',
  totalStock: 48,
  trackingMode: 'auto',
  shelfLifeDays: 14,
  categoryRule: 'Dairy & Eggs',
}

const INITIAL_BATCHES = [
  { id: 'b1', quantity: 20, expiryDate: '2026-02-14', status: 'active' },
  { id: 'b2', quantity: 15, expiryDate: '2026-02-21', status: 'active' },
]

// ——— Helpers ———
function daysUntil(dateStr) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function DaysLeftLabel({ days }) {
  let weight = 'font-normal text-gray-500'
  if (days <= 3) weight = 'font-semibold text-gray-900'
  else if (days <= 7) weight = 'font-medium text-gray-700'
  if (days < 0)
    return <span className="text-xs font-semibold text-gray-900">Expired</span>
  if (days === 0)
    return <span className="text-xs font-semibold text-gray-900">Today</span>
  return <span className={`text-xs ${weight}`}>{days}d left</span>
}

// ——— Sub-components ———

function ModalOverlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative mt-[6vh] w-full max-w-[620px] mx-4 max-h-[88vh] flex flex-col bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function SectionDivider() {
  return <div className="border-t border-gray-100" />
}

function Badge({ children, dark }) {
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${
        dark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {children}
    </span>
  )
}

function InlineInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
  ...props
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border border-gray-200 rounded-lg px-3 py-[7px] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors ${className}`}
      {...props}
    />
  )
}

function SmallButton({ children, onClick, primary, disabled, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-sm font-medium px-3.5 py-[7px] rounded-lg transition-all ${
        primary
          ? 'bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500'
          : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  )
}

// ——— Batch Row ———
function BatchRow({
  batch,
  isHighlighted,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}) {
  const days = daysUntil(batch.expiryDate)
  const [editQty, setEditQty] = useState(String(batch.quantity))
  const [editDate, setEditDate] = useState(batch.expiryDate)

  useEffect(() => {
    setEditQty(String(batch.quantity))
    setEditDate(batch.expiryDate)
  }, [batch, isEditing])

  const barWidth =
    days <= 0 ? 100 : days <= 3 ? 85 : days <= 7 ? 55 : days <= 14 ? 35 : 15

  if (isEditing) {
    return (
      <div className="px-5 py-3 bg-gray-50 border-y border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">
              Expiry date
            </label>
            <InlineInput
              type="date"
              value={editDate}
              onChange={setEditDate}
              className="w-full"
            />
          </div>
          <div className="w-24">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">
              Qty
            </label>
            <InlineInput
              type="number"
              value={editQty}
              onChange={setEditQty}
              min="1"
              className="w-full"
            />
          </div>
          <div className="flex items-end gap-2 pb-[1px]">
            <SmallButton
              primary
              onClick={() => onSave(batch.id, editDate, parseInt(editQty))}
            >
              Save
            </SmallButton>
            <SmallButton onClick={onCancel}>Cancel</SmallButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => onStartEdit(batch.id)}
      className={`group px-5 py-3 flex items-center cursor-pointer transition-colors ${
        isHighlighted
          ? 'bg-gray-50 border-l-2 border-l-gray-900'
          : 'hover:bg-gray-50/70 border-l-2 border-l-transparent'
      }`}
    >
      {/* Urgency micro-bar */}
      <div className="w-8 mr-3 flex flex-col items-center">
        <div className="w-1 h-6 bg-gray-100 rounded-full overflow-hidden relative">
          <div
            className="absolute bottom-0 w-full rounded-full bg-gray-400 transition-all"
            style={{ height: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900">
            {batch.quantity} units
          </span>
          <span className="text-[11px] text-gray-400">·</span>
          <span className="text-sm text-gray-500">
            {formatDate(batch.expiryDate)}
          </span>
        </div>
      </div>

      {/* Days left + status */}
      <div className="flex items-center gap-3 ml-4">
        <DaysLeftLabel days={days} />
        <Badge>{batch.status}</Badge>
        <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-xs">
          Edit →
        </span>
      </div>
    </div>
  )
}

// ——— Untracked Alert ———
function UntrackedAlert({ count, onAdd, autoExpand = false }) {
  const [date, setDate] = useState('')
  const [qty, setQty] = useState('')
  const [expanded, setExpanded] = useState(autoExpand)
  const inputRef = useRef(null)

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus()
  }, [expanded])

  if (count <= 0) return null

  return (
    <div className="mx-5 my-4 border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-600">
            !
          </div>
          <div>
            <span className="text-sm font-medium text-gray-800">
              {count} units have no expiry date
            </span>
            <span className="text-xs text-gray-400 ml-2">
              {expanded ? '▾' : '▸'} {expanded ? 'Collapse' : 'Add batch'}
            </span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                Expiry date
              </label>
              <input
                ref={inputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-[7px] text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
              />
            </div>
            <div className="w-24">
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1 block">
                Quantity
              </label>
              <InlineInput
                type="number"
                value={qty}
                onChange={setQty}
                placeholder={String(count)}
                min="1"
                max={count}
                className="w-full"
              />
            </div>
            <SmallButton
              primary
              disabled={!date}
              onClick={() => {
                const q = parseInt(qty) || count
                onAdd(date, Math.min(q, count))
                setDate('')
                setQty('')
              }}
            >
              + Add batch
            </SmallButton>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Quantity defaults to all {count} untracked units if left blank.
          </p>
        </div>
      )}
    </div>
  )
}

// ——— Empty State ———
function EmptyBatches({ onStartAdd }) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center text-lg text-gray-400">
        ⊞
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">
        No batches tracked yet
      </p>
      <p className="text-xs text-gray-400 mb-4">
        Add an expiry date to start tracking this product's inventory by batch.
      </p>
      <SmallButton
        primary
        onClick={onStartAdd}
      >
        + Add your first batch
      </SmallButton>
    </div>
  )
}

// ——— Tracking Settings ———
function TrackingSettings({
  mode,
  shelfLife,
  categoryRule,
  onChangeMode,
  onChangeShelfLife,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [editShelfLife, setEditShelfLife] = useState(String(shelfLife))

  return (
    <div className="px-5 py-3">
      <button
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{isOpen ? '▾' : '▸'}</span>
        Tracking settings
      </button>

      {isOpen && (
        <div className="mt-3 pl-0.5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24">Mode</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {['auto', 'manual'].map((m) => (
                <button
                  key={m}
                  onClick={() => onChangeMode(m)}
                  className={`text-xs font-medium px-3 py-1 rounded-md transition-all ${
                    mode === m
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {mode === 'auto' && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24">Shelf life</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editShelfLife}
                    onChange={(e) => setEditShelfLife(e.target.value)}
                    onBlur={() =>
                      onChangeShelfLife(parseInt(editShelfLife) || shelfLife)
                    }
                    className="w-16 border border-gray-200 rounded-lg px-2.5 py-1 text-sm text-gray-900 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200"
                    min="1"
                  />
                  <span className="text-xs text-gray-500">days</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24">
                  Inherited from
                </span>
                <Badge>{categoryRule} category</Badge>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ——— Main Modal ———
function ProductDetailModal({
  onClose,
  highlightBatchId = null,
  focusAddDate = false,
}) {
  const [batches, setBatches] = useState(INITIAL_BATCHES)
  const [editingBatchId, setEditingBatchId] = useState(null)
  const [trackingMode, setTrackingMode] = useState(PRODUCT.trackingMode)
  const [shelfLife, setShelfLife] = useState(PRODUCT.shelfLifeDays)
  const [highlightedId, setHighlightedId] = useState(highlightBatchId)
  const [addDateExpanded, setAddDateExpanded] = useState(focusAddDate)

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedId) {
      const t = setTimeout(() => setHighlightedId(null), 3000)
      return () => clearTimeout(t)
    }
  }, [highlightedId])

  const trackedQty = batches.reduce((sum, b) => sum + b.quantity, 0)
  const untrackedQty = PRODUCT.totalStock - trackedQty
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate),
  )

  const handleAddBatch = (date, qty) => {
    setBatches((prev) => [
      ...prev,
      {
        id: `b${Date.now()}`,
        quantity: qty,
        expiryDate: date,
        status: 'active',
      },
    ])
  }

  const handleSaveEdit = (id, newDate, newQty) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, expiryDate: newDate, quantity: newQty } : b,
      ),
    )
    setEditingBatchId(null)
  }

  return (
    <ModalOverlay onClose={onClose}>
      {/* ——— Sticky Header ——— */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-gray-900 leading-tight">
              {PRODUCT.name}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {PRODUCT.sku}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Badge>{PRODUCT.category}</Badge>
          <Badge>{PRODUCT.brand}</Badge>
          <div className="flex-1" />
          <span className="text-sm font-semibold text-gray-900">
            {PRODUCT.totalStock}
          </span>
          <span className="text-xs text-gray-400">total units</span>
        </div>
      </div>

      {/* ——— Scrollable Body ——— */}
      <div className="flex-1 overflow-y-auto">
        {/* Untracked Alert */}
        <UntrackedAlert
          count={untrackedQty}
          onAdd={handleAddBatch}
          autoExpand={addDateExpanded}
        />

        {/* Batches Section */}
        <div className="px-5 pt-2 pb-1 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Batches
            </span>
            <span className="text-[11px] text-gray-400">
              {sortedBatches.length} tracked
            </span>
          </div>
          <span className="text-[11px] text-gray-400">
            Sorted by expiry · soonest first
          </span>
        </div>

        {sortedBatches.length === 0 ? (
          <EmptyBatches
            onStartAdd={() => {
              /* the UntrackedAlert handles this */
            }}
          />
        ) : (
          <div className="divide-y divide-gray-50">
            {sortedBatches.map((batch) => (
              <BatchRow
                key={batch.id}
                batch={batch}
                isHighlighted={batch.id === highlightedId}
                isEditing={batch.id === editingBatchId}
                onStartEdit={setEditingBatchId}
                onSave={handleSaveEdit}
                onCancel={() => setEditingBatchId(null)}
              />
            ))}
          </div>
        )}

        <SectionDivider />

        {/* Tracking Settings */}
        <TrackingSettings
          mode={trackingMode}
          shelfLife={shelfLife}
          categoryRule={PRODUCT.categoryRule}
          onChangeMode={setTrackingMode}
          onChangeShelfLife={setShelfLife}
        />
      </div>

      {/* ——— Sticky Footer ——— */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">
          {trackedQty} of {PRODUCT.totalStock} units tracked
        </span>
        <div className="flex items-center gap-2">
          <SmallButton onClick={onClose}>Close</SmallButton>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ——— Demo Harness ———
export default function ProductDetailModalDemo() {
  const [modalState, setModalState] = useState(null) // null | 'default' | 'highlighted' | 'addDate'

  const demos = [
    {
      key: 'default',
      label: 'From product row',
      sub: 'Default view with all batches',
    },
    {
      key: 'highlighted',
      label: 'From expiring soon table',
      sub: 'Batch #1 highlighted (3 days left)',
    },
    {
      key: 'addDate',
      label: 'From "Add expiry date"',
      sub: 'Focused on adding untracked units',
    },
  ]

  return (
    <div
      className="min-h-screen bg-gray-100 flex items-center justify-center p-8"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900">
            Product Detail Modal
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            LIFO wireframe — 3 entry points
          </p>
        </div>

        <div className="space-y-3">
          {demos.map((d) => (
            <button
              key={d.key}
              onClick={() => setModalState(d.key)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900 group-hover:text-black">
                    {d.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{d.sub}</div>
                </div>
                <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-sm">
                  →
                </span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Click any entry point above to open the modal
        </p>
      </div>

      {modalState && (
        <ProductDetailModal
          onClose={() => setModalState(null)}
          highlightBatchId={modalState === 'highlighted' ? 'b1' : null}
          focusAddDate={modalState === 'addDate'}
        />
      )}
    </div>
  )
}
