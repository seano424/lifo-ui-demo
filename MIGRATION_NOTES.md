# Migration Notes - Batch Actions Refactor

## Overview
This document outlines the major changes made during the batch actions refactor, including removed components and their replacements.

## Removed Components and Their Replacements

### Dashboard Components
- **Removed**: `components/dashboard/actionable-batches-enhanced.tsx`
  - **Replacement**: Functionality moved to `components/todos/todos-filtered-list.tsx`
  - **Migration**: Use TodosFilteredList with appropriate filters instead

- **Removed**: `components/dashboard/urgent-alerts.tsx`
  - **Replacement**: Integrated into main todos dashboard
  - **Migration**: Alert functionality now part of the todos system

- **Removed**: `components/dashboard/alert-quick-toggle.tsx`
  - **Replacement**: Filter functionality in `components/todos/filters/`
  - **Migration**: Use TodoFiltersPanel for filtering capabilities

### Batch Management Components
- **Removed**: `components/batches/batch-card.tsx`
  - **Replacement**: `components/todos/todo-card.tsx`
  - **Migration**: TodoCard provides enhanced batch display with actions

- **Removed**: `components/batches/batch-list.tsx`
  - **Replacement**: `components/todos/todo-card-list.tsx`
  - **Migration**: Use TodoCardList for displaying lists of actionable batches

- **Removed**: `components/batches/batch-analysis.tsx`
  - **Replacement**: Analytics integrated into todo cards
  - **Migration**: Batch analysis now part of individual todo items

- **Removed**: `components/batches/batch-dashboard-stats.tsx`
  - **Replacement**: `components/dashboard/batch-status-summary.tsx` (updated)
  - **Migration**: Enhanced stats component with improved performance

### Product Management Components
- **Removed**: `components/products/product-card.tsx`
  - **Replacement**: Product information integrated into `components/todos/todo-card.tsx`
  - **Migration**: Product details now part of todo items

- **Removed**: `components/products/product-list.tsx`
  - **Replacement**: `components/todos/todo-card-list.tsx`
  - **Migration**: Use todo system for product management

### User Management Components
- **Removed**: `components/users/user-card.tsx`
- **Removed**: `components/users/user-filters.tsx`
- **Removed**: `components/users/user-stats.tsx`
- **Removed**: `components/users/users-list.tsx`
  - **Note**: User management functionality consolidated elsewhere

### Store User Components
- **Removed**: `components/store-users/pin-management-actions.tsx`
- **Removed**: `components/store-users/store-user-card.tsx`
- **Removed**: `components/store-users/store-user-stats.tsx`
- **Removed**: `components/store-users/store-users-filter.tsx`
  - **Note**: Store user management functionality consolidated

### Todos Components (Deprecated)
- **Removed**: `components/todos/batch-action-card.tsx`
  - **Replacement**: `components/todos/todo-card.tsx`
  - **Migration**: Enhanced todo card with better batch action integration

- **Removed**: `components/todos/batch-action-filters.tsx`
  - **Replacement**: `components/todos/filters/todo-filters-panel.tsx`
  - **Migration**: New comprehensive filtering system

- **Removed**: `components/todos/todos-card-list.tsx`
  - **Replacement**: `components/todos/todo-card-list.tsx`
  - **Migration**: Improved card list with infinite scroll

- **Removed**: `components/todos/todos-filters.tsx`
  - **Replacement**: Multiple filter components in `components/todos/filters/`
  - **Migration**: Use TodoFiltersPanel, TodoSearchBar, and TodoSortControls

### CSV Upload Components
- **Removed**: `components/csv-upload/csv-mapping-info.tsx`
- **Removed**: `components/csv-upload/csv-success-modal.tsx`
- **Removed**: `components/csv-upload/duplicate-resolution-modal.tsx`
  - **Note**: CSV upload functionality may have been consolidated or moved

### Settings Components
- **Removed**: `components/settings/settings-header-display.tsx`
- **Removed**: `components/settings/settings-tabs.tsx`
- **Removed**: `components/settings/team-management.tsx`
  - **Note**: Settings functionality may have been reorganized

### Debug Components
- **Removed**: `components/debug/auth-status.tsx`
- **Removed**: `components/debug/email-test.tsx`
  - **Note**: Debug components removed for production

### Hooks
- **Removed**: `hooks/use-donations.ts`
- **Removed**: `hooks/use-language.ts`
- **Removed**: `hooks/use-scoring-analytics.ts`
  - **Replacement**: Functionality consolidated into `hooks/use-batch-actions-rpc.ts`

## New Components Added

### Todo Filters
- `components/todos/filters/todo-filters-bar.tsx` - Main filter controls
- `components/todos/filters/todo-filters-panel.tsx` - Complete filter panel
- `components/todos/filters/todo-search-bar.tsx` - Search functionality
- `components/todos/filters/todo-sort-controls.tsx` - Sorting controls

### Todo Tabs
- `components/todos/todos-main-tabs/completed-tab.tsx`
- `components/todos/todos-main-tabs/in-progress-tab.tsx`
- `components/todos/todos-main-tabs/pending-tab.tsx`

### Todo Dialog Tabs
- `components/todos/todos-dialog-tabs/discount-tab.tsx`
- `components/todos/todos-dialog-tabs/dispose-tab.tsx`
- `components/todos/todos-dialog-tabs/donate-tab.tsx`
- `components/todos/todos-dialog-tabs/sold-tab.tsx`

### New Hooks
- `hooks/use-batch-actions-rpc.ts` - Comprehensive batch action management
- `hooks/use-todos-with-filters.ts` - Enhanced todos querying with filters
- `hooks/use-debounce.ts` - Debouncing utility

### Query Management
- `lib/queries/query-keys.ts` - Centralized query key management
- `lib/queries/todos-rpc.ts` - Todo RPC functions

## Breaking Changes
None - all changes maintain backward compatibility with existing data structures.

## Migration Steps
1. Replace any imports of removed components with their new equivalents
2. Update any direct references to removed hooks
3. Use the new filtering system for advanced todo management
4. Leverage the new batch action system for bulk operations

## Benefits of New System
- Improved performance with better query management
- Enhanced type safety throughout
- Better separation of concerns
- More intuitive user interface
- Comprehensive batch action capabilities
- Real-time updates with optimistic updates