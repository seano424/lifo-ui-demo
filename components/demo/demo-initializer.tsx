'use client'
import { useEffect } from 'react'
import { useStoreState } from '@/lib/stores/store-context'
import { mockStore, mockUserStores } from '@/lib/mocks/demo-data'

export function DemoInitializer() {
  const { setActiveStore, setUserStores, setLoadingStores } = useStoreState()

  useEffect(() => {
    setUserStores(mockUserStores)
    setActiveStore(mockStore)
    setLoadingStores(false)
  }, [setActiveStore, setUserStores, setLoadingStores])

  return null
}
