// lib/react-query/prefetch.ts

import { dehydrate } from '@tanstack/react-query'
import { createQueryClient } from './client'

export async function createPrefetchedQuery() {
  const queryClient = createQueryClient()
  return { queryClient, dehydratedState: dehydrate(queryClient) }
}
