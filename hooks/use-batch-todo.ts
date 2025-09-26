import { queryKeys } from '@/lib/queries/query-keys'
import type { TodoItem } from '@/lib/queries/todos-rpc'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

/**
 * Fetches the TodoItem data for a specific batch using the secure RPC function
 */
async function fetchBatchTodo(batchId: string): Promise<TodoItem | null> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('get_batch_todo_by_id', {
    target_batch_id: batchId,
  })

  if (error) {
    console.error('Error fetching batch todo:', error)
    return null
  }

  return data || null
}

/**
 * Hook to fetch todo data for a specific batch
 */
export function useBatchTodo(batchId: string | null) {
  return useQuery({
    queryKey: queryKeys.batches.todo(batchId || ''),
    queryFn: () => fetchBatchTodo(batchId!),
    enabled: !!batchId,
    staleTime: 0, // Always refetch - important for seeing updates
    gcTime: 3 * 60 * 1000, // 3 minutes
  })
}
