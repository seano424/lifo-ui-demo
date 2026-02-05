import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// =============================================================================
// TYPES
// =============================================================================

export type ProductSelectionMode = 'all' | 'by_category' | 'individual' | null

export interface ProductSelection {
  mode: ProductSelectionMode
  selectedCategoryIds: string[]
  selectedProductIds: string[]
}

export interface CategorySetting {
  categoryId: string
  categoryName: string
  productCount: number
  defaultShelfLifeDays: number | null
  autoCreateBatches: boolean
}

export interface ProductOverride {
  productId: string
  shelfLifeOverrideDays: number | null
  autoCreateBatches: boolean | null
}

export interface SetupResult {
  success: boolean
  categoriesUpdated: number
  productsUpdated: number
}

// =============================================================================
// STATE INTERFACE
// =============================================================================

export interface BatchTrackingOnboardingState {
  // Navigation
  currentScreen: 1 | 2 | 3 | 4 | 5 | 6

  // Screen 2: Product Selection
  productSelection: ProductSelection

  // Screen 3: Category Automation
  categorySettings: CategorySetting[]

  // Screen 4: Product Overrides
  productOverrides: ProductOverride[]

  // Screen 6: Result
  setupResult: SetupResult | null

  // Navigation Actions
  setCurrentScreen: (screen: 1 | 2 | 3 | 4 | 5 | 6) => void
  goToNextScreen: () => void
  goToPreviousScreen: () => void

  // Screen 2 Actions
  setProductSelectionMode: (mode: 'all' | 'by_category' | 'individual') => void
  toggleCategorySelection: (categoryId: string) => void
  toggleProductSelection: (productId: string) => void

  // Screen 3 Actions
  initializeCategorySettings: (
    categories: Array<{
      categoryId: string
      categoryName: string
      productCount: number
      defaultShelfLifeDays: number | null
      autoCreateBatches: boolean
    }>,
  ) => void
  updateCategorySettings: (
    categoryId: string,
    updates: Partial<Omit<CategorySetting, 'categoryId'>>,
  ) => void

  // Screen 4 Actions
  updateProductOverride: (productId: string, updates: Partial<ProductOverride>) => void
  clearProductOverride: (productId: string) => void

  // Completion Actions
  setSetupResult: (result: SetupResult) => void
  resetWizard: () => void

  // Validation Helpers
  canProceedFromScreen2: () => boolean
  getTrackedProductCount: () => number
  getAutomatedCategoryCount: () => number
  getProductOverrideCount: () => number
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  currentScreen: 1 as 1 | 2 | 3 | 4 | 5 | 6,
  productSelection: {
    mode: null,
    selectedCategoryIds: [],
    selectedProductIds: [],
  },
  categorySettings: [],
  productOverrides: [],
  setupResult: null,
}

// =============================================================================
// STORE
// =============================================================================

export const useBatchTrackingOnboardingStore = create<BatchTrackingOnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation Actions
      setCurrentScreen: (screen: 1 | 2 | 3 | 4 | 5 | 6) => {
        set({ currentScreen: screen })
      },

      goToNextScreen: () => {
        const { currentScreen } = get()
        if (currentScreen < 6) {
          set({ currentScreen: (currentScreen + 1) as 1 | 2 | 3 | 4 | 5 | 6 })
        }
      },

      goToPreviousScreen: () => {
        const { currentScreen } = get()
        if (currentScreen > 1) {
          set({ currentScreen: (currentScreen - 1) as 1 | 2 | 3 | 4 | 5 | 6 })
        }
      },

      // Screen 2 Actions
      setProductSelectionMode: (mode: 'all' | 'by_category' | 'individual') => {
        set({
          productSelection: {
            mode,
            selectedCategoryIds: [],
            selectedProductIds: [],
          },
        })
      },

      toggleCategorySelection: (categoryId: string) => {
        set(state => {
          const { selectedCategoryIds } = state.productSelection
          const isSelected = selectedCategoryIds.includes(categoryId)

          return {
            productSelection: {
              ...state.productSelection,
              selectedCategoryIds: isSelected
                ? selectedCategoryIds.filter(id => id !== categoryId)
                : [...selectedCategoryIds, categoryId],
            },
          }
        })
      },

      toggleProductSelection: (productId: string) => {
        set(state => {
          const { selectedProductIds } = state.productSelection
          const isSelected = selectedProductIds.includes(productId)

          return {
            productSelection: {
              ...state.productSelection,
              selectedProductIds: isSelected
                ? selectedProductIds.filter(id => id !== productId)
                : [...selectedProductIds, productId],
            },
          }
        })
      },

      // Screen 3 Actions
      initializeCategorySettings: (
        categories: Array<{
          categoryId: string
          categoryName: string
          productCount: number
          defaultShelfLifeDays: number | null
          autoCreateBatches: boolean
        }>,
      ) => {
        set({ categorySettings: categories })
      },

      updateCategorySettings: (
        categoryId: string,
        updates: Partial<Omit<CategorySetting, 'categoryId'>>,
      ) => {
        set(state => ({
          categorySettings: state.categorySettings.map(setting =>
            setting.categoryId === categoryId ? { ...setting, ...updates } : setting,
          ),
        }))
      },

      // Screen 4 Actions
      updateProductOverride: (productId: string, updates: Partial<ProductOverride>) => {
        set(state => {
          const existingIndex = state.productOverrides.findIndex(o => o.productId === productId)

          if (existingIndex >= 0) {
            // Update existing override
            const updatedOverrides = [...state.productOverrides]
            updatedOverrides[existingIndex] = {
              ...updatedOverrides[existingIndex],
              ...updates,
            }
            return { productOverrides: updatedOverrides }
          }

          // Add new override
          return {
            productOverrides: [
              ...state.productOverrides,
              {
                productId,
                shelfLifeOverrideDays: null,
                autoCreateBatches: null,
                ...updates,
              },
            ],
          }
        })
      },

      clearProductOverride: (productId: string) => {
        set(state => ({
          productOverrides: state.productOverrides.filter(o => o.productId !== productId),
        }))
      },

      // Completion Actions
      setSetupResult: (result: SetupResult) => {
        set({ setupResult: result })
      },

      resetWizard: () => {
        set(initialState)
      },

      // Validation Helpers
      canProceedFromScreen2: () => {
        const { productSelection } = get()

        if (!productSelection.mode) return false
        if (productSelection.mode === 'all') return true
        if (productSelection.mode === 'by_category') {
          return productSelection.selectedCategoryIds.length > 0
        }
        if (productSelection.mode === 'individual') {
          return productSelection.selectedProductIds.length > 0
        }

        return false
      },

      getTrackedProductCount: () => {
        const { categorySettings } = get()
        return categorySettings.reduce((sum, category) => sum + category.productCount, 0)
      },

      getAutomatedCategoryCount: () => {
        const { categorySettings } = get()
        return categorySettings.filter(c => c.autoCreateBatches).length
      },

      getProductOverrideCount: () => {
        const { productOverrides } = get()
        return productOverrides.length
      },
    }),
    {
      name: 'lifo-batch-tracking-onboarding',
      // Only persist essential state, not transient results
      partialize: state => ({
        currentScreen: state.currentScreen,
        productSelection: state.productSelection,
        categorySettings: state.categorySettings,
        productOverrides: state.productOverrides,
      }),
    },
  ),
)
