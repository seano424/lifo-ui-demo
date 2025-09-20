import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { useInfiniteQuery } from '@tanstack/react-query'

import {
  type TodoSection,
  fetchTodosBySection,
  getSectionConfig,
} from '@/lib/queries/todos-rpc'

// hooks/use-todo-section.ts
export function useTodoSection(section: TodoSection, pageSize?: number) {
  const activeStoreId = useActiveStoreId()
  const config = getSectionConfig(section)
  const finalPageSize = pageSize || config.defaultPageSize

  return useInfiniteQuery({
    queryKey: queryKeys.todos.bySection(
      activeStoreId || '',
      section,
      finalPageSize
    ),
    queryFn: ({ pageParam = 0 }) =>
      fetchTodosBySection(activeStoreId!, section, {
        page: pageParam,
        pageSize: finalPageSize,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!activeStoreId,
    staleTime: config.staleTimeMs,
    gcTime: config.cacheTimeMs,
  })
}

// Specific section hooks
export const useImmediateActionTodos = (pageSize?: number) =>
  useTodoSection('immediate_action', pageSize)

export const useRecentlyExpiredTodos = (pageSize?: number) =>
  useTodoSection('recently_expired', pageSize)

export const useInProgressTodos = (pageSize?: number) =>
  useTodoSection('in_progress', pageSize)

export const useDiscountedTodos = (pageSize?: number) =>
  useTodoSection('discounted', pageSize)

export const useReadyForDonationTodos = (pageSize?: number) =>
  useTodoSection('ready_for_donation', pageSize)

export const useCompletedTodayTodos = (pageSize?: number) =>
  useTodoSection('completed_today', pageSize)

export const useActionHistoryTodos = (pageSize?: number) =>
  useTodoSection('action_history', pageSize)
