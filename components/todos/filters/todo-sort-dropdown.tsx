'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpDown, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TodoSortFields } from './todo-sort-fields'
import { TodoSortDirection } from './todo-sort-direction'
import type { SortConfig, SortDirection, SortField } from './types'

interface TodoSortDropdownProps {
  sortConfig: SortConfig
  onSortChange: (sortConfig: SortConfig) => void
  onReset: () => void
}

export function TodoSortDropdown({ sortConfig, onSortChange, onReset }: TodoSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Click outside to close & Escape key handler
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleFieldChange = (field: SortField) => {
    onSortChange({ ...sortConfig, field })
  }

  const handleDirectionChange = (direction: SortDirection) => {
    onSortChange({ ...sortConfig, direction })
  }

  return (
    <div ref={dropdownRef}>
      <Button
        variant={isOpen ? 'secondary' : 'outline'}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          'gap-2 w-full md:w-auto',
          isOpen && 'bg-violet-100 text-violet-700 border-violet-200',
        )}
      >
        <ArrowUpDown className="h-4 w-4" />
        Sort
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 md:right-auto mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex overflow-hidden min-w-full sm:min-w-[480px]">
          <TodoSortFields selectedField={sortConfig.field} onFieldSelect={handleFieldChange} />
          <TodoSortDirection
            sortConfig={sortConfig}
            onDirectionChange={handleDirectionChange}
            onReset={() => {
              onReset()
              setIsOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
