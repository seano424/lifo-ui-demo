import { useState, useMemo } from 'react'
import { useCurrency } from '@/hooks/use-currency'
import { PRICE_CONSTRAINTS } from '@/lib/constants/file-upload'

export interface CsvPreviewItem {
  SKU: string
  Product_Name: string
  Category: string
  Quantity: number
  Expiry_Date: string
  Cost_Price: number
  Selling_Price: number
  [key: string]: string | number
}

export interface UseBatchUploadBaseReturn {
  // State
  items: CsvPreviewItem[]
  currentPage: number
  totalPages: number
  pricingErrors: Record<number, string>

  // Actions
  setItems: (items: CsvPreviewItem[]) => void
  updateItemSku: (index: number, value: string) => void
  updateItemProductName: (index: number, value: string) => void
  updateItemQuantity: (index: number, value: number) => void
  updateItemCostPrice: (index: number, value: number) => void
  updateItemSellingPrice: (index: number, value: number) => void
  updateItemExpiry: (index: number, value: string) => void
  updateItemCategory: (index: number, value: string) => void

  // Computed
  currentPageItems: CsvPreviewItem[]
  hasValidationErrors: boolean

  // Pagination
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToPage: (page: number) => void

  // Utilities
  resetState: () => void
}

export interface UseBatchUploadBaseOptions {
  itemsPerPage?: number
  onItemsChange?: (items: CsvPreviewItem[]) => void
}

export function useBatchUploadBase(
  options: UseBatchUploadBaseOptions = {},
): UseBatchUploadBaseReturn {
  const { itemsPerPage = 10, onItemsChange } = options
  const currencySymbol = useCurrency()

  const [items, setItemsInternal] = useState<CsvPreviewItem[]>([])
  const [currentPage, setCurrentPage] = useState(0)

  // Wrapper to call onItemsChange when items update
  const setItems = (newItems: CsvPreviewItem[]) => {
    setItemsInternal(newItems)
    onItemsChange?.(newItems)
  }

  // Validation: check for pricing errors
  const pricingErrors = useMemo(() => {
    const errors: Record<number, string> = {}
    items.forEach((item, index) => {
      if (item.Cost_Price < PRICE_CONSTRAINTS.MIN_PRICE) {
        errors[index] =
          `Cost price must be at least ${currencySymbol}${PRICE_CONSTRAINTS.MIN_PRICE.toFixed(2)}`
      }
      if (item.Selling_Price < PRICE_CONSTRAINTS.MIN_PRICE) {
        errors[index] =
          errors[index] ||
          `Selling price must be at least ${currencySymbol}${PRICE_CONSTRAINTS.MIN_PRICE.toFixed(2)}`
      }
    })
    return errors
  }, [items, currencySymbol])

  const hasValidationErrors = useMemo(() => {
    return Object.keys(pricingErrors).length > 0
  }, [pricingErrors])

  // Pagination
  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIndex = currentPage * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, items.length)
  const currentPageItems = items.slice(startIndex, endIndex)

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page)
    }
  }

  // Update functions
  const updateItemSku = (index: number, value: string) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              SKU: value.slice(0, 100), // Truncate to database constraint
            }
          : item,
      ),
    )
  }

  const updateItemProductName = (index: number, value: string) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              Product_Name: value.slice(0, 255), // Truncate to database constraint
            }
          : item,
      ),
    )
  }

  const updateItemQuantity = (index: number, value: number) => {
    const validatedQuantity = Math.max(1, Math.min(100000, Math.floor(value)))
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              Quantity: validatedQuantity,
            }
          : item,
      ),
    )
  }

  const updateItemCostPrice = (index: number, value: number) => {
    const validatedPrice = Math.max(
      PRICE_CONSTRAINTS.MIN_PRICE,
      Math.min(PRICE_CONSTRAINTS.MAX_PRICE, value),
    )
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              Cost_Price: validatedPrice,
            }
          : item,
      ),
    )
  }

  const updateItemSellingPrice = (index: number, value: number) => {
    const validatedPrice = Math.max(
      PRICE_CONSTRAINTS.MIN_PRICE,
      Math.min(PRICE_CONSTRAINTS.MAX_PRICE, value),
    )
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              Selling_Price: validatedPrice,
            }
          : item,
      ),
    )
  }

  const updateItemExpiry = (index: number, value: string) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              Expiry_Date: value,
            }
          : item,
      ),
    )
  }

  const updateItemCategory = (index: number, value: string) => {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              Category: value,
            }
          : item,
      ),
    )
  }

  const resetState = () => {
    setItems([])
    setCurrentPage(0)
  }

  return {
    // State
    items,
    currentPage,
    totalPages,
    pricingErrors,

    // Actions
    setItems,
    updateItemSku,
    updateItemProductName,
    updateItemQuantity,
    updateItemCostPrice,
    updateItemSellingPrice,
    updateItemExpiry,
    updateItemCategory,

    // Computed
    currentPageItems,
    hasValidationErrors,

    // Pagination
    goToNextPage,
    goToPreviousPage,
    goToPage,

    // Utilities
    resetState,
  }
}
