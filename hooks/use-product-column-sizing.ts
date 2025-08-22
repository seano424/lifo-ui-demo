import { useEffect, useState } from 'react'

const COLUMN_WIDTHS_STORAGE_KEY = 'lifo-product-table-columns'

const DEFAULT_COLUMN_WIDTHS = {
  name: 300,
  category: 140,
  brand: 140,
  total_stock: 100,
  base_selling_price: 110,
  active_batches_count: 130,
  created_at: 110,
  actions: 60,
}

export function useProductColumnSizing() {
  const [columnSizing, setColumnSizing] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return DEFAULT_COLUMN_WIDTHS
        }
      }
    }
    return DEFAULT_COLUMN_WIDTHS
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnSizing))
    }
  }, [columnSizing])

  return {
    columnSizing,
    setColumnSizing,
    DEFAULT_COLUMN_WIDTHS,
  }
}
