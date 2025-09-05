// Create stable default values
const DEFAULT_STEP: ScanningStep = 'barcode'
const DEFAULT_WORKFLOW_PROGRESS = {
  currentStep: 'barcode' as ScanningStep,
  currentIndex: 0,
  progress: 0,
  isComplete: false,
  hasError: false,
}

import { useCallback, useEffect, useState } from 'react'
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { BarcodeDetection } from '@/components/barcode/barcode-scanner'
import type { ProductLookupResult } from '@/lib/queries/open-food-facts'

// Translation function type - will be set by components using the store
type TranslationFunction = (key: string) => string
let translateFunction: TranslationFunction | null = null

// Function to set the translation function from components
export const setScanningWorkflowTranslations = (t: TranslationFunction) => {
  translateFunction = t
}

// Helper to get translated text with fallback
const t = (key: string, fallback: string): string => {
  return translateFunction ? translateFunction(key) : fallback
}

export type ScanningStep =
  | 'barcode' // Scanning barcode or manual entry
  | 'product' // Showing product details, confirming/editing
  | 'ocr' // Taking photo and processing expiry date
  | 'confirmation' // Final confirmation before creating batch
  | 'complete' // Success state
  | 'error' // Error state

export interface ScannedProduct {
  barcode: string
  detection?: BarcodeDetection
  lookupResult?: ProductLookupResult
  // Manual override fields
  productName?: string
  brand?: string
  category?: string
  imageUrl?: string
  isManualEntry?: boolean
}

export interface ExpiryDateInfo {
  extractedDate?: string
  confidence?: number
  isManual?: boolean
  rawOcrText?: string
  processingTime?: number
}

export interface BatchData {
  quantity: number
  costPrice?: number
  sellingPrice?: number
  supplierCode?: string
  location?: string
  notes?: string
}

export interface ScanningWorkflowState {
  // Current workflow state
  currentStep: ScanningStep
  storeId: string | null

  // Scanned data
  scannedProduct: ScannedProduct | null
  expiryInfo: ExpiryDateInfo | null
  batchData: BatchData | null

  // UI state
  isProcessing: boolean
  error: string | null

  // History for quick re-scanning
  scanHistory: ScannedProduct[]

  // Actions
  setStoreId: (storeId: string) => void
  setCurrentStep: (step: ScanningStep) => void

  // Barcode step actions
  setBarcodeScanned: (barcode: string, detection?: BarcodeDetection) => void
  setProductLookupResult: (result: ProductLookupResult) => void
  setManualProductEntry: (productData: {
    productName: string
    brand?: string
    category?: string
    imageUrl?: string
  }) => void

  // Product step actions
  confirmProduct: () => void
  editProduct: (updates: Partial<ScannedProduct>) => void
  setProductSelected: (productData: {
    barcode: string
    productName: string
    brand?: string
    category?: string
    imageUrl?: string
    isManualEntry?: boolean
    lookupResult?: ProductLookupResult
  }) => void

  // OCR step actions
  setExpiryDateProcessing: (isProcessing: boolean) => void
  setExpiryDateResult: (expiryInfo: ExpiryDateInfo) => void
  setManualExpiryDate: (date: string) => void

  // Confirmation step actions
  setBatchData: (batchData: BatchData) => void
  updateBatchData: (updates: Partial<BatchData>) => void

  // Workflow control
  completeWorkflow: () => void
  resetWorkflow: () => void
  setError: (error: string | null) => void

  // History management
  addToHistory: (product: ScannedProduct) => void
  clearHistory: () => void
  rescanFromHistory: (product: ScannedProduct) => void

  // Navigation actions
  goBackStep: () => void
  canGoBack: () => boolean
  getPreviousStepName: () => string | null
}

const initialState = {
  currentStep: 'barcode' as ScanningStep,
  storeId: null,
  scannedProduct: null,
  expiryInfo: null,
  batchData: null,
  isProcessing: false,
  error: null,
  scanHistory: [],
}

export const useScanningWorkflowStore = create<ScanningWorkflowState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Store management
        setStoreId: (storeId: string) =>
          set(state => {
            state.storeId = storeId
          }),

        setCurrentStep: (step: ScanningStep) =>
          set(state => {
            state.currentStep = step
            state.error = null // Clear errors when moving to new step
          }),

        // Barcode scanning actions
        setBarcodeScanned: (barcode: string, detection?: BarcodeDetection) =>
          set(state => {
            state.scannedProduct = {
              barcode,
              detection,
              isManualEntry: !detection || detection.format === 'Manual Entry',
            }
            state.currentStep = 'product'
            state.error = null
          }),

        setProductLookupResult: (result: ProductLookupResult) =>
          set(state => {
            if (state.scannedProduct) {
              state.scannedProduct.lookupResult = result

              // Auto-fill from lookup result if found
              if (result.found && result.product) {
                state.scannedProduct.productName =
                  result.product.product_name || result.product.product_name_en || 'Unknown Product'
                state.scannedProduct.brand = result.product.brands || undefined
                state.scannedProduct.category = result.product.categories
                  ? String(result.product.categories).split(',')[0]?.trim() || undefined
                  : undefined
                state.scannedProduct.imageUrl =
                  result.product.image_front_url || result.product.image_url || undefined
              }

              // Auto-advance to OCR step after lookup completes (whether found or not)
              // This eliminates the manual "Proceed to Expiry Date Scanning" step
              // BUT don't auto-advance if we're already on barcode step (user went back deliberately)
              if (state.currentStep !== 'barcode') {
                state.currentStep = 'ocr'
              }

              // Add to history for quick rescanning
              const existingIndex = state.scanHistory.findIndex(
                (item: ScannedProduct) => item.barcode === state.scannedProduct!.barcode,
              )

              if (existingIndex >= 0) {
                // Update existing entry
                state.scanHistory[existingIndex] = { ...state.scannedProduct }
              } else {
                // Add new entry (keep last 10)
                state.scanHistory = [{ ...state.scannedProduct }, ...state.scanHistory.slice(0, 9)]
              }
            }
          }),

        setManualProductEntry: productData =>
          set(state => {
            if (state.scannedProduct) {
              state.scannedProduct.productName = productData.productName
              state.scannedProduct.brand = productData.brand
              state.scannedProduct.category = productData.category
              state.scannedProduct.imageUrl = productData.imageUrl
              state.scannedProduct.isManualEntry = true
            }
          }),

        // Product confirmation actions
        confirmProduct: () =>
          set(state => {
            if (state.scannedProduct) {
              state.currentStep = 'ocr'

              // Add to history for quick rescanning
              const existingIndex = state.scanHistory.findIndex(
                (item: ScannedProduct) => item.barcode === state.scannedProduct!.barcode,
              )

              if (existingIndex >= 0) {
                // Update existing entry
                state.scanHistory[existingIndex] = { ...state.scannedProduct }
              } else {
                // Add new entry (keep last 10)
                state.scanHistory = [{ ...state.scannedProduct }, ...state.scanHistory.slice(0, 9)]
              }
            }
          }),

        editProduct: updates =>
          set(state => {
            if (state.scannedProduct) {
              Object.assign(state.scannedProduct, updates)
            }
          }),

        setProductSelected: productData =>
          set(state => {
            state.scannedProduct = {
              barcode: productData.barcode,
              productName: productData.productName,
              brand: productData.brand,
              category: productData.category,
              imageUrl: productData.imageUrl,
              isManualEntry: productData.isManualEntry || false,
              lookupResult: productData.lookupResult,
            }
            // Skip directly to OCR step
            state.currentStep = 'ocr'
            state.error = null
          }),

        // OCR actions
        setExpiryDateProcessing: (isProcessing: boolean) =>
          set(state => {
            state.isProcessing = isProcessing
          }),

        setExpiryDateResult: (expiryInfo: ExpiryDateInfo) =>
          set(state => {
            state.expiryInfo = expiryInfo
            state.isProcessing = false
            state.currentStep = 'confirmation'
          }),

        setManualExpiryDate: (date: string) =>
          set(state => {
            state.expiryInfo = {
              extractedDate: date,
              isManual: true,
              confidence: 1.0,
            }
            state.currentStep = 'confirmation'
          }),

        // Batch data actions
        setBatchData: (batchData: BatchData) =>
          set(state => {
            state.batchData = batchData
          }),

        updateBatchData: (updates: Partial<BatchData>) =>
          set(state => {
            if (state.batchData) {
              Object.assign(state.batchData, updates)
            } else {
              state.batchData = { quantity: 1, ...updates }
            }
          }),

        // Workflow control
        completeWorkflow: () =>
          set(state => {
            state.currentStep = 'complete'
            state.isProcessing = false
            state.error = null
          }),

        resetWorkflow: () =>
          set(state => {
            state.currentStep = 'barcode'
            state.scannedProduct = null
            state.expiryInfo = null
            state.batchData = null
            state.isProcessing = false
            state.error = null
          }),

        setError: (error: string | null) =>
          set(state => {
            state.error = error
            state.isProcessing = false
            if (error) {
              state.currentStep = 'error'
            }
          }),

        // History management
        addToHistory: (product: ScannedProduct) =>
          set(state => {
            const existingIndex = state.scanHistory.findIndex(
              (item: ScannedProduct) => item.barcode === product.barcode,
            )

            if (existingIndex >= 0) {
              state.scanHistory[existingIndex] = product
            } else {
              state.scanHistory = [product, ...state.scanHistory.slice(0, 9)]
            }
          }),

        clearHistory: () =>
          set(state => {
            state.scanHistory = []
          }),

        rescanFromHistory: (product: ScannedProduct) =>
          set(state => {
            state.scannedProduct = { ...product }
            state.currentStep = 'product'
            state.expiryInfo = null
            state.batchData = null
            state.error = null
          }),

        // Navigation actions
        goBackStep: () =>
          set(state => {
            switch (state.currentStep) {
              case 'product':
                // Go back to barcode scanning
                state.currentStep = 'barcode'
                // Clear the scanned product but keep it in history
                if (state.scannedProduct) {
                  const existingIndex = state.scanHistory.findIndex(
                    (item: ScannedProduct) => item.barcode === state.scannedProduct!.barcode,
                  )
                  if (existingIndex >= 0) {
                    state.scanHistory[existingIndex] = { ...state.scannedProduct }
                  } else {
                    state.scanHistory = [
                      { ...state.scannedProduct },
                      ...state.scanHistory.slice(0, 9),
                    ]
                  }
                }
                state.scannedProduct = null
                break

              case 'ocr':
                // Go back to barcode scanning but KEEP the product
                state.currentStep = 'barcode'
                // Keep scanned product in history and PRESERVE current product
                if (state.scannedProduct) {
                  const existingIndex = state.scanHistory.findIndex(
                    (item: ScannedProduct) => item.barcode === state.scannedProduct!.barcode,
                  )
                  if (existingIndex >= 0) {
                    state.scanHistory[existingIndex] = { ...state.scannedProduct }
                  } else {
                    state.scanHistory = [
                      { ...state.scannedProduct },
                      ...state.scanHistory.slice(0, 9),
                    ]
                  }
                }
                // DON'T clear the scannedProduct - keep it selected
                // state.scannedProduct = null  // REMOVED
                // Clear expiry info
                state.expiryInfo = null
                break

              case 'confirmation':
                // 🔥 FIX: Go back to OCR step and clear expiry data to show camera again
                state.currentStep = 'ocr'
                // Clear expiry info to reset the OCR step completely
                state.expiryInfo = null
                // Keep batch data but clear it to show fresh form
                state.batchData = null
                break

              case 'complete':
                // Go back to confirmation step
                state.currentStep = 'confirmation'
                break

              case 'error':
                // Go back to the last valid step (try to recover)
                if (state.batchData) {
                  state.currentStep = 'confirmation'
                } else if (state.expiryInfo) {
                  state.currentStep = 'ocr'
                } else if (state.scannedProduct) {
                  state.currentStep = 'product'
                } else {
                  state.currentStep = 'barcode'
                }
                state.error = null
                break

              default:
                // Already at the first step, can't go back further
                break
            }
          }),

        canGoBack: () => {
          const state = get()
          return state.currentStep !== 'barcode'
        },

        getPreviousStepName: () => {
          const state = get()
          switch (state.currentStep) {
            case 'product':
              return t('scanningWorkflow.steps.scanBarcode', 'Scan Barcode')
            case 'ocr':
              return state.scannedProduct
                ? t('scanningWorkflow.steps.changeProduct', 'Change Product')
                : t('scanningWorkflow.steps.scanBarcode', 'Scan Barcode')
            case 'confirmation':
              return t('scanningWorkflow.steps.scanExpiryDate', 'Scan Expiry Date')
            case 'complete':
              return t('scanningWorkflow.steps.reviewDetails', 'Review Details')
            case 'error':
              return t('scanningWorkflow.steps.previousStep', 'Previous Step')
            default:
              return null
          }
        },
      })),
    ),
  ),
)

// 🔥 COMPLETELY REWRITTEN: SSR-safe hooks with no store access during SSR
// SSR-safe store access hook
function useClientOnlyStore<T>(selector: (state: ScanningWorkflowState) => T, defaultValue: T): T {
  const [isClient, setIsClient] = useState(false)
  const [value, setValue] = useState(defaultValue)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Only subscribe to store on client side
  useEffect(() => {
    if (!isClient) return

    const unsubscribe = useScanningWorkflowStore.subscribe(
      selector,
      newValue => setValue(newValue),
      {
        fireImmediately: true,
      },
    )

    return unsubscribe
  }, [isClient, selector])

  return value
}

// Simple selector hooks (completely SSR-safe)
export const useScanningStep = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.currentStep, [])
  return useClientOnlyStore(selector, DEFAULT_STEP)
}

export const useScannedProduct = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.scannedProduct, [])
  return useClientOnlyStore(selector, null)
}

export const useExpiryInfo = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.expiryInfo, [])
  return useClientOnlyStore(selector, null)
}

export const useBatchData = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.batchData, [])
  return useClientOnlyStore(selector, null)
}

export const useScanningProcessing = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.isProcessing, [])
  return useClientOnlyStore(selector, false)
}

export const useScanningError = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.error, [])
  return useClientOnlyStore(selector, null)
}

export const useScanHistory = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.scanHistory, [])
  return useClientOnlyStore(selector, [])
}

// Complex workflow progress hook (SSR-safe)
export const useWorkflowProgress = () => {
  const [isClient, setIsClient] = useState(false)
  const [progress, setProgress] = useState(DEFAULT_WORKFLOW_PROGRESS)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const unsubscribe = useScanningWorkflowStore.subscribe(
      state => state.currentStep,
      currentStep => {
        const steps: ScanningStep[] = ['barcode', 'product', 'ocr', 'confirmation', 'complete']
        const currentIndex = steps.indexOf(currentStep)
        const progressPercent = currentIndex >= 0 ? (currentIndex / (steps.length - 1)) * 100 : 0

        setProgress({
          currentStep,
          currentIndex,
          progress: progressPercent,
          isComplete: currentStep === 'complete',
          hasError: currentStep === 'error',
        })
      },
      {
        fireImmediately: true,
      },
    )

    return unsubscribe
  }, [isClient])

  return progress
}

export const useScanningActions = () => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Return stable functions that are safe to call anytime
  return {
    setStoreId: (storeId: string) => {
      if (isClient) useScanningWorkflowStore.getState().setStoreId(storeId)
    },
    setCurrentStep: (step: ScanningStep) => {
      if (isClient) useScanningWorkflowStore.getState().setCurrentStep(step)
    },
    resetWorkflow: () => {
      if (isClient) useScanningWorkflowStore.getState().resetWorkflow()
    },
    setBarcodeScanned: (barcode: string, detection?: BarcodeDetection) => {
      if (isClient) useScanningWorkflowStore.getState().setBarcodeScanned(barcode, detection)
    },
    setProductLookupResult: (result: ProductLookupResult) => {
      if (isClient) useScanningWorkflowStore.getState().setProductLookupResult(result)
    },
    setManualProductEntry: (productData: {
      productName: string
      brand?: string
      category?: string
      imageUrl?: string
    }) => {
      if (isClient) useScanningWorkflowStore.getState().setManualProductEntry(productData)
    },
    setProductSelected: (productData: {
      barcode: string
      productName: string
      brand?: string
      category?: string
      imageUrl?: string
      isManualEntry?: boolean
      lookupResult?: ProductLookupResult
    }) => {
      if (isClient) useScanningWorkflowStore.getState().setProductSelected(productData)
    },
    confirmProduct: () => {
      if (isClient) useScanningWorkflowStore.getState().confirmProduct()
    },
    setExpiryDateProcessing: (isProcessing: boolean) => {
      if (isClient) useScanningWorkflowStore.getState().setExpiryDateProcessing(isProcessing)
    },
    setExpiryDateResult: (expiryInfo: ExpiryDateInfo) => {
      if (isClient) useScanningWorkflowStore.getState().setExpiryDateResult(expiryInfo)
    },
    setManualExpiryDate: (date: string) => {
      if (isClient) useScanningWorkflowStore.getState().setManualExpiryDate(date)
    },
    setBatchData: (batchData: BatchData) => {
      if (isClient) useScanningWorkflowStore.getState().setBatchData(batchData)
    },
    completeWorkflow: () => {
      if (isClient) useScanningWorkflowStore.getState().completeWorkflow()
    },
    setError: (error: string | null) => {
      if (isClient) useScanningWorkflowStore.getState().setError(error)
    },
    goBackStep: () => {
      if (isClient) useScanningWorkflowStore.getState().goBackStep()
    },
    canGoBack: () => {
      if (isClient) return useScanningWorkflowStore.getState().canGoBack()
      return false
    },
    getPreviousStepName: () => {
      if (isClient) return useScanningWorkflowStore.getState().getPreviousStepName()
      return null
    },
  }
}

export const useCanProceed = () => {
  const [isClient, setIsClient] = useState(false)
  const [canProceed, setCanProceed] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const unsubscribe = useScanningWorkflowStore.subscribe(
      state => ({
        currentStep: state.currentStep,
        scannedProduct: state.scannedProduct,
        expiryInfo: state.expiryInfo,
        batchData: state.batchData,
      }),
      ({ currentStep, scannedProduct, expiryInfo, batchData }) => {
        switch (currentStep) {
          case 'barcode':
            setCanProceed(!!scannedProduct?.barcode)
            break
          case 'product':
            setCanProceed(!!(scannedProduct?.productName && scannedProduct?.barcode))
            break
          case 'ocr':
            setCanProceed(!!expiryInfo?.extractedDate)
            break
          case 'confirmation':
            setCanProceed(!!(batchData?.quantity && batchData.quantity > 0))
            break
          default:
            setCanProceed(false)
        }
      },
      {
        fireImmediately: true,
      },
    )

    return unsubscribe
  }, [isClient])

  return canProceed
}

// Persist workflow data (SSR-safe)
export const usePersistWorkflow = () => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const saveWorkflow = () => {
    if (!isClient) return

    const state = useScanningWorkflowStore.getState()
    const persistData = {
      storeId: state.storeId,
      scannedProduct: state.scannedProduct,
      expiryInfo: state.expiryInfo,
      batchData: state.batchData,
      currentStep: state.currentStep,
      scanHistory: state.scanHistory,
      timestamp: Date.now(),
    }

    localStorage.setItem('lifo-scanning-workflow', JSON.stringify(persistData))
  }

  const loadWorkflow = () => {
    if (!isClient) return false

    try {
      const saved = localStorage.getItem('lifo-scanning-workflow')
      if (!saved) return false

      const data = JSON.parse(saved)

      // Only restore if less than 1 hour old
      if (Date.now() - data.timestamp > 60 * 60 * 1000) {
        localStorage.removeItem('lifo-scanning-workflow')
        return false
      }

      const store = useScanningWorkflowStore.getState()

      // Restore state
      if (data.storeId) store.setStoreId(data.storeId)
      if (data.scannedProduct) {
        store.setBarcodeScanned(data.scannedProduct.barcode, data.scannedProduct.detection)
        if (data.scannedProduct.lookupResult) {
          store.setProductLookupResult(data.scannedProduct.lookupResult)
        }
      }
      if (data.expiryInfo) store.setExpiryDateResult(data.expiryInfo)
      if (data.batchData) store.setBatchData(data.batchData)
      if (data.scanHistory) {
        data.scanHistory.forEach((product: ScannedProduct) => {
          store.addToHistory(product)
        })
      }
      if (data.currentStep && data.currentStep !== 'complete') {
        store.setCurrentStep(data.currentStep)
      }

      return true
    } catch (error) {
      console.error('Failed to restore workflow:', error)
      localStorage.removeItem('lifo-scanning-workflow')
      return false
    }
  }

  const clearPersistedWorkflow = () => {
    if (!isClient) return
    localStorage.removeItem('lifo-scanning-workflow')
  }

  return {
    saveWorkflow,
    loadWorkflow,
    clearPersistedWorkflow,
  }
}

// 🔥 NEW: Hook to get go back state
export const useCanGoBack = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.canGoBack(), [])
  return useClientOnlyStore(selector, false)
}

export const usePreviousStepName = () => {
  const selector = useCallback((state: ScanningWorkflowState) => state.getPreviousStepName(), [])
  return useClientOnlyStore(selector, null)
}
