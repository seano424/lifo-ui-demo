'use client'

import {
  useImmediateActionTodos,
  useTodosSections,
} from '@/hooks/use-todos-sections'

export default function TodoSections() {
  const { sections, summary, isAnyLoading, urgent, workInProgress, completed } =
    useTodosSections()

  console.log(
    'sections',
    sections,
    summary,
    isAnyLoading,
    urgent,
    workInProgress,
    completed
  )

  const { data: immediateAction } = useImmediateActionTodos()
  console.log('immediateAction', immediateAction)

  return <div>todo-sections</div>
}
