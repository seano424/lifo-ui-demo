// hooks/use-store-settings.ts - FIXED VERSION with better error handling
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId, useStoreState } from '@/lib/stores/store-context'
import { usePermissions } from '@/hooks/use-users'
import { useCurrentUser } from '@/hooks/use-users'
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

// Hook to check store permissions
export function useStorePermissions() {
  const activeStoreId = useActiveStoreId()
  const {
    canManageSettings,
    isOwner,
    isManager,
    isEmployee,
    isLoading: permissionsLoading,
  } = usePermissions()

  console.log('🔍 useStorePermissions - Raw values:', {
    activeStoreId,
    canManageSettings,
    isOwner,
    isManager,
    isEmployee,
    permissionsLoading,
  })

  // When loading OR when no activeStoreId is selected, return undefined for permission flags
  // This prevents premature false values when the store context hasn't loaded yet
  if (permissionsLoading || !activeStoreId) {
    console.log('⏳ useStorePermissions - Still loading or no activeStoreId, returning undefined flags')
    return {
      canEditStore: undefined,
      canEditBasicInfo: undefined,
      canEditAdvancedSettings: undefined,
      canEditAISettings: undefined,
      canViewSettings: undefined,
      isOwner: undefined,
      isManager: undefined,
      isEmployee: undefined,
      isLoading: permissionsLoading || !activeStoreId,
    }
  }

  const computedPermissions = {
    canEditStore: canManageSettings || isOwner,
    canEditBasicInfo: canManageSettings || isOwner || isManager,
    canEditAdvancedSettings: canManageSettings || isOwner,
    canEditAISettings: isOwner, // Only owners can modify AI settings
    canViewSettings: canManageSettings || isOwner || isManager,
    isOwner,
    isManager,
    isEmployee,
    isLoading: permissionsLoading,
  }

  console.log('✅ useStorePermissions - Computed permissions:', computedPermissions)
  return computedPermissions
}

// Hook to fetch store settings
export function useStoreSettings() {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.stores.detail(activeStoreId || ''),
    queryFn: () => {
      if (!activeStoreId) {
        throw new Error('No active store selected')
      }
      return fetchStoreSettings(activeStoreId)
    },
    enabled: !!activeStoreId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry permission errors
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

      console.log('🚀 Starting store update mutation for store:', activeStoreId)
      console.log('📝 Update data:', updates)

      // Debug: Check store access before attempting update
      try {
        const debugResult = await debugStoreAccess(activeStoreId)
        console.log('🔍 Store access debug result:', debugResult)
      } catch (debugError) {
        console.warn('⚠️ Debug check failed:', debugError)
      }

      // Attempt the update
      try {
        const result = await updateStoreBasicInfo(activeStoreId, updates)
        console.log('✅ Store update successful:', result)
        return result
      } catch (updateError) {
        console.error('❌ Store update failed:', updateError)

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

      console.log('🔄 Starting optimistic update...')

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

      console.log('✅ Optimistic update applied')
      return { previousStore, activeStoreId }
    },
    onError: (err, variables, context) => {
      console.error('❌ Mutation error occurred:', err)

      // Revert on error
      if (context?.previousStore && context?.activeStoreId) {
        console.log('🔄 Reverting optimistic update...')
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
        console.log('🔄 Invalidating queries after mutation...')
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
    onSuccess: (data) => {
      console.log('✅ Mutation completed successfully:', data)
      
      // Update Zustand store to reflect changes in team switcher
      if (activeStoreId && data) {
        console.log('🔄 Updating Zustand store with new store data...')
        
        // Convert StoreBasicInfo to Store type using utility function
        const storeData = convertStoreBasicInfoToStore(data)
        
        // Update the active store in Zustand
        setActiveStore(storeData)
        
        // Update the store in userStores array
        const updatedUserStores = userStores.map(userStore => {
          if (userStore.store.store_id === activeStoreId) {
            return {
              ...userStore,
              store: storeData
            }
          }
          return userStore
        })
        setUserStores(updatedUserStores)
        
        console.log('✅ Zustand store updated successfully')
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
      console.error('Settings update error:', err)
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
      console.log('🚀 Starting combined store update:', updates)

      // Update basic info if provided and user has permission
      if (updates.basicInfo && canEditBasicInfo) {
        console.log('📝 Updating basic info...')
        await updateBasicInfo.mutateAsync(updates.basicInfo)
      }

      // Update settings if provided and user has permission
      if (updates.settings && canEditAdvancedSettings) {
        console.log('⚙️ Updating advanced settings...')
        await updateAdvancedSettings.mutateAsync(updates.settings)
      }

      console.log('✅ Combined store update completed successfully')
      toast.success('Store information updated successfully')
    } catch (error) {
      console.error('❌ Combined store update failed:', error)
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

      console.log('📸 Starting image upload:', {
        fileName: file.name,
        type,
        storeId: activeStoreId,
      })

      // TODO: Implement actual image upload
      // For now, return a placeholder URL
      const fakeUrl = `https://placeholder.com/store-${type}-${activeStoreId}-${Date.now()}`

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('✅ Image upload completed:', fakeUrl)
      return fakeUrl
    },
    onSuccess: (imageUrl, { type }) => {
      if (activeStoreId) {
        console.log('🔄 Updating store with new image URL:', { type, imageUrl })

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
      console.error('❌ Image upload error:', error)
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
