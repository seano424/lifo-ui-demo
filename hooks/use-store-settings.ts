import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId, useStoreState } from '@/lib/stores/store-context'
import { usePermissions, useCurrentUser } from '@/hooks/use-users'

import { convertStoreBasicInfoToStore } from '@/lib/utils'
import {
  fetchStoreSettings,
  updateStoreBasicInfo,
  updateStoreAdvancedSettings,
  validateStoreCode,
  validateStoreEmail,
  debugStoreAccess,
  type StoreBasicInfo,
  type StoreAdvancedSettings,
  type StoreSettingsData,
} from '@/lib/queries/store-settings'
import type { UserStorePermissions } from '@/lib/server/permissions'

export function useStorePermissions({
  serverPermissions,
  storeId,
}: {
  serverPermissions?: UserStorePermissions
  storeId?: string
} = {}) {
  const contextStoreId = useActiveStoreId()
  const effectiveStoreId = storeId || contextStoreId

  const {
    canManageSettings,
    isOwner,
    isManager,
    isEmployee,
    isLoading: permissionsLoading,
  } = usePermissions()

  if (serverPermissions && effectiveStoreId) {
    return {
      canEditStore: serverPermissions.canEditAdvancedSettings || serverPermissions.isOwner,
      canEditBasicInfo:
        serverPermissions.canEditBasicInfo ||
        serverPermissions.isOwner ||
        serverPermissions.isManager,
      canEditAdvancedSettings:
        serverPermissions.canEditAdvancedSettings || serverPermissions.isOwner,
      canEditAISettings: serverPermissions.isOwner,
      canViewSettings:
        serverPermissions.canViewSettings ||
        serverPermissions.isOwner ||
        serverPermissions.isManager,
      isOwner: serverPermissions.isOwner,
      isManager: serverPermissions.isManager,
      isEmployee: serverPermissions.isEmployee,
      isLoading: false,
    }
  }

  // Fall back to client permissions when server permissions not available
  if (permissionsLoading || !effectiveStoreId) {
    return {
      canEditStore: undefined,
      canEditBasicInfo: undefined,
      canEditAdvancedSettings: undefined,
      canEditAISettings: undefined,
      canViewSettings: undefined,
      isOwner: undefined,
      isManager: undefined,
      isEmployee: undefined,
      isLoading: permissionsLoading || !effectiveStoreId,
    }
  }

  const computedPermissions = {
    canEditStore: canManageSettings || isOwner,
    canEditBasicInfo: canManageSettings || isOwner || isManager,
    canEditAdvancedSettings: canManageSettings || isOwner,
    canEditAISettings: isOwner,
    canViewSettings: canManageSettings || isOwner || isManager,
    isOwner,
    isManager,
    isEmployee,
    isLoading: permissionsLoading,
  }

  return computedPermissions
}

// 🚀 UPDATED: Hook to fetch store settings with optional storeId parameter
export function useStoreSettings(storeId?: string) {
  const contextStoreId = useActiveStoreId()
  const effectiveStoreId = storeId || contextStoreId

  return useQuery({
    queryKey: queryKeys.stores.detail(effectiveStoreId || ''),
    queryFn: () => {
      if (!effectiveStoreId) {
        throw new Error('No store ID available')
      }
      return fetchStoreSettings(effectiveStoreId)
    },
    enabled: !!effectiveStoreId, // Only run query when we have a storeId
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // 🚀 CRITICAL: Prevent refetch if we have cached data
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('permission denied') || error?.message?.includes('403')) {
        return false
      }
      return failureCount < 2
    },
  })
}

// Hook to update store basic information - ENHANCED with debugging
export function useUpdateStoreBasicInfo() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()
  const { data: currentUser } = useCurrentUser()
  const { setActiveStore, setUserStores, userStores } = useStoreState()

  return useMutation({
    mutationFn: async (updates: Partial<StoreBasicInfo>) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }

      // Attempt the update
      try {
        const result = await updateStoreBasicInfo(activeStoreId, updates)
        return result
      } catch (updateError) {
        // Provide more helpful error messages
        if (updateError instanceof Error && updateError.message.includes('permission denied')) {
          throw new Error(
            'Permission denied: You need owner or manager permissions to update store settings. ' +
              'Please contact your store owner if you believe this is an error.',
          )
        }

        if (updateError instanceof Error && updateError.message.includes('stores')) {
          throw new Error(
            'Database error: Unable to access the stores table. This might be a schema or permission issue.',
          )
        }

        throw updateError
      }
    },
    onMutate: async updates => {
      if (!activeStoreId) return

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.stores.detail(activeStoreId),
      })

      // Snapshot previous value
      const previousStore = queryClient.getQueryData(queryKeys.stores.detail(activeStoreId))

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.stores.detail(activeStoreId),
        (old: StoreSettingsData | undefined) => {
          if (!old) return undefined
          return { ...old, ...updates }
        },
      )

      return { previousStore, activeStoreId }
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousStore && context?.activeStoreId) {
        queryClient.setQueryData(
          queryKeys.stores.detail(context.activeStoreId),
          context.previousStore,
        )
      }

      // Enhanced error message
      let errorMessage = err.message

      if (err.message.includes('permission denied')) {
        errorMessage = "You don't have permission to update this store. Contact your store owner."
      } else if (err.message.includes('not found') || err.message.includes('PGRST116')) {
        errorMessage = "Store not found or you don't have access to it."
      } else if (err.message.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      }

      toast.error(`Failed to update store: ${errorMessage}`)
    },
    onSettled: () => {
      if (activeStoreId) {
        // Always refetch after mutation
        queryClient.invalidateQueries({
          queryKey: queryKeys.stores.detail(activeStoreId),
        })
        // Invalidate user stores to refresh team switcher
        if (currentUser?.id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.stores.userStores(currentUser.id),
          })
        }
      }
    },
    onSuccess: data => {
      // Update Zustand store to reflect changes in team switcher
      if (activeStoreId && data) {
        // Convert StoreBasicInfo to Store type using utility function
        const storeData = convertStoreBasicInfoToStore(data)

        // Update the active store in Zustand
        setActiveStore(storeData)

        // Update the store in userStores array
        const updatedUserStores = userStores.map(userStore => {
          if (userStore.store.store_id === activeStoreId) {
            return {
              ...userStore,
              store: storeData,
            }
          }
          return userStore
        })
        setUserStores(updatedUserStores)
      }

      toast.success('Store information updated successfully')
    },
  })
}

// Hook to update store advanced settings
export function useUpdateStoreAdvancedSettings() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()
  const { data: currentUser } = useCurrentUser()

  return useMutation({
    mutationFn: async (updates: Partial<StoreAdvancedSettings>) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return updateStoreAdvancedSettings(activeStoreId, updates)
    },
    onMutate: async updates => {
      if (!activeStoreId) return

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.stores.detail(activeStoreId),
      })

      // Snapshot previous value
      const previousStore = queryClient.getQueryData(queryKeys.stores.detail(activeStoreId)) as
        | StoreSettingsData
        | undefined

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.stores.detail(activeStoreId),
        (old: StoreSettingsData | undefined) =>
          old
            ? {
                ...old,
                settings: old.settings
                  ? { ...old.settings, ...updates }
                  : (updates as StoreAdvancedSettings),
              }
            : undefined,
      )

      return { previousStore, activeStoreId }
    },
    onError: (err, variables, context) => {
      // Revert on error
      if (context?.previousStore && context?.activeStoreId) {
        queryClient.setQueryData(
          queryKeys.stores.detail(context.activeStoreId),
          context.previousStore,
        )
      }
      toast.error(`Failed to update settings: ${err.message}`)
    },
    onSettled: () => {
      if (activeStoreId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.stores.detail(activeStoreId),
        })
        // Invalidate user stores to refresh team switcher
        if (currentUser?.id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.stores.userStores(currentUser.id),
          })
        }
      }
    },
    onSuccess: () => {
      // Note: Advanced settings don't affect the team switcher display
      // since they're stored separately from basic store info
      toast.success('Store settings updated successfully')
    },
  })
}

// Hook for store actions (combined operations) - ENHANCED
export function useStoreActions() {
  const updateBasicInfo = useUpdateStoreBasicInfo()
  const updateAdvancedSettings = useUpdateStoreAdvancedSettings()
  const { canEditStore, canEditBasicInfo, canEditAdvancedSettings } = useStorePermissions()

  const updateStoreInformation = async (updates: {
    basicInfo?: Partial<StoreBasicInfo>
    settings?: Partial<StoreAdvancedSettings>
  }) => {
    if (!canEditStore) {
      throw new Error('You do not have permission to edit store settings')
    }

    try {
      // Update basic info if provided and user has permission
      if (updates.basicInfo && canEditBasicInfo) {
        await updateBasicInfo.mutateAsync(updates.basicInfo)
      }

      // Update settings if provided and user has permission
      if (updates.settings && canEditAdvancedSettings) {
        await updateAdvancedSettings.mutateAsync(updates.settings)
      }

      toast.success('Store information updated successfully')
    } catch (error) {
      toast.error(
        `Failed to update store: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
      throw error
    }
  }

  return {
    updateStoreInformation,
    updateBasicInfo: updateBasicInfo.mutate,
    updateAdvancedSettings: updateAdvancedSettings.mutate,
    isUpdating: updateBasicInfo.isPending || updateAdvancedSettings.isPending,
    canEditStore,
    canEditBasicInfo,
    canEditAdvancedSettings,
  }
}

// Hook for store validation
export function useStoreValidation() {
  const activeStoreId = useActiveStoreId()

  const validateStoreCodeQuery = useMutation({
    mutationFn: async (storeCode: string) => {
      return validateStoreCode(storeCode, activeStoreId || undefined)
    },
  })

  const validateEmailQuery = useMutation({
    mutationFn: async (email: string) => {
      return validateStoreEmail(email, activeStoreId || undefined)
    },
  })

  return {
    validateStoreCode: validateStoreCodeQuery.mutateAsync,
    validateEmail: validateEmailQuery.mutateAsync,
    isValidatingCode: validateStoreCodeQuery.isPending,
    isValidatingEmail: validateEmailQuery.isPending,
  }
}

// Hook for store debug (useful for troubleshooting)
export function useStoreDebug() {
  const activeStoreId = useActiveStoreId()

  const debugQuery = useMutation({
    mutationFn: async () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return debugStoreAccess(activeStoreId)
    },
  })

  return {
    runDebug: debugQuery.mutate,
    debugResult: debugQuery.data,
    isDebugging: debugQuery.isPending,
    debugError: debugQuery.error,
  }
}

// Hook for store image uploads (placeholder - enhanced)
export function useStoreImageUpload() {
  const queryClient = useQueryClient()
  const activeStoreId = useActiveStoreId()

  const uploadImage = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'logo' | 'cover' }) => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }

      // TODO: Implement actual image upload
      // For now, return a placeholder URL
      const fakeUrl = `https://placeholder.com/store-${type}-${activeStoreId}-${Date.now()}`

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      return fakeUrl
    },
    onSuccess: (imageUrl, { type }) => {
      if (activeStoreId) {
        // Update the store with the new image URL
        const updateField = type === 'logo' ? 'logo_url' : 'cover_image_url'

        // Optimistically update the cache
        queryClient.setQueryData(
          queryKeys.stores.detail(activeStoreId),
          (old: StoreSettingsData | undefined) =>
            old ? { ...old, [updateField]: imageUrl } : undefined,
        )

        toast.success(`${type === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully`)
      }
    },
    onError: error => {
      toast.error(
        `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    },
  })

  return {
    uploadImage: uploadImage.mutate,
    isUploading: uploadImage.isPending,
  }
}
