import { useState, useEffect } from 'react'

const COLUMN_WIDTHS_STORAGE_KEY = 'lifo-batch-table-columns'

const DEFAULT_COLUMN_WIDTHS = {
  batch_number: 120,
  product: 200,
  supplier: 120,
  expiry_date: 140,
  current_quantity: 100,
  cost_price: 110,
  selling_price: 110,
  status: 100,
  actions: 50,
}

export function useColumnSizing() {
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
