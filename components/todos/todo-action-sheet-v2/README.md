# TodoActionSheetV2 - Refactored Action-First UI

This is a complete redesign of the `todo-action-bottom-sheet` component with an action-first layout and Whisper aesthetic.

## Overview

The new component replaces tab navigation with inline form expansion, making actions more immediately accessible and reducing the number of taps required to complete common tasks.

## Key Features

### 1. Action-First Layout
- **4-button grid**: Sell | Discount | Donate | Dispose
- **Inline form expansion**: Forms expand below buttons when clicked
- **Suggested action highlighting**: AI-recommended actions get a subtle border highlight
- **One-tap access**: No more tab switching

### 2. Whisper Aesthetic
- **Monochrome colors**: Uses subtle grays (#1d1d1f, #86868b, #6e6e73)
- **Minimal accent color**: Red used sparingly for expired/urgent states
- **Clean typography**: Sentence case throughout, no uppercase
- **Subtle animations**: Smooth transitions and micro-interactions

### 3. Improved UX
- **Context at a glance**: "Expired X days ago · Y units · €Z at risk"
- **Collapsible sections**: Batch details and history hidden by default
- **Inline editing**: Edit batch details without leaving the sheet
- **Success feedback**: Toast notification appears after actions

## Component Structure

```
todo-action-sheet-v2/
├── components/
│   ├── action-button.tsx       # Grid button with highlight
│   ├── action-form.tsx          # Form wrapper with expansion animation
│   ├── quantity-selector.tsx    # Stepper + "All" button
│   ├── collapsible-section.tsx  # Expandable section with chevron
│   └── success-toast.tsx        # Confirmation feedback
├── forms/
│   ├── sell-form.tsx            # Timing + quantity + revenue preview
│   ├── discount-form.tsx        # Presets + custom + price preview
│   ├── donate-form.tsx          # Recipient selector + quantity
│   └── dispose-form.tsx         # Reason + quantity + loss summary
├── todo-action-sheet-v2.tsx     # Main component
└── index.ts                     # Export
```

## Business Logic Reuse

**All existing business logic is preserved:**
- Uses `useBatchActionRPC()` for all action executions
- Uses `useBatchTodo()` for fresh batch data
- Uses `useBatchActions()` for batch updates
- All validation and error handling remains unchanged
- Same RPC function calls with identical parameters

## Usage

```tsx
import { TodoActionSheetV2 } from '@/components/todos/todo-action-sheet-v2'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<TodoItem | null>(null)

  return (
    <TodoActionSheetV2
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      selectedBatch={selectedBatch}
      currencySymbol="€"
    />
  )
}
```

## Implementation Details

### Suggested Action Detection
The component automatically determines the suggested action based on the `ai_recommendation` field:
- Recommendations containing "discount" → highlight Discount button
- Recommendations containing "donate" → highlight Donate button
- Recommendations containing "dispose" → highlight Dispose button
- Recommendations containing "sell"/"sold" → highlight Sell button

### Form States
- **Inactive**: Form is collapsed (max-height: 0)
- **Active**: Form expands smoothly (max-height: 500px, opacity fade-in)
- **Loading**: Submit button shows spinner, form fields disabled
- **Success**: Toast appears, form collapses after 1.5s, modal closes

### Animations
- **Modal slide up**: 300ms cubic-bezier for natural entrance
- **Form expansion**: 300ms ease-in-out height + opacity transition
- **Button press**: scale(0.96) for tactile feedback
- **Success toast**: Pop animation with overshoot

### Edit Mode
Batch details section supports inline editing:
- Click "Edit" button to enter edit mode
- Edit: expiry date, cost price, selling price
- Save/Cancel buttons appear in section header
- Success toast on save
- Revalidates batch data automatically

## Accessibility

- **Semantic HTML**: Proper button types, labels, and roles
- **Keyboard navigation**: All interactive elements are keyboard accessible
- **Focus management**: Logical tab order
- **ARIA labels**: Screen reader support (to be added if needed)

## Migration from v1

To migrate from the old component:

1. **Import the new component**:
   ```tsx
   import { TodoActionSheetV2 } from '@/components/todos/todo-action-sheet-v2'
   ```

2. **Same props interface**:
   - No changes required to prop passing
   - Drop-in replacement for `TodoActionBottomSheet`

3. **Test all action flows**:
   - Verify sold, discount, donate, dispose actions work
   - Check success/error toasts appear correctly
   - Ensure batch data refreshes after actions

## Known Limitations

- **Print labels checkbox**: Currently in discount form but not fully implemented (backend support needed)
- **Dark mode**: Basic support included but may need refinement
- **Translation keys**: Uses existing translation keys, may need updates for new UI text

## Future Enhancements

- [ ] Add "Print labels" backend integration
- [ ] Add action history timeline view
- [ ] Add undo/redo for recent actions
- [ ] Add batch image preview in header
- [ ] Add quick actions from notification badges
- [ ] Add keyboard shortcuts (e.g., S for Sell, D for Discount)

## Testing Checklist

- [ ] All 4 actions execute successfully
- [ ] Quantity selector works correctly
- [ ] Custom discount percentage validation
- [ ] Recipient selector integration
- [ ] Disposal reason "Other" text input
- [ ] Batch details edit mode saves correctly
- [ ] Success toast appears and auto-dismisses
- [ ] Error toasts show on action failure
- [ ] Loading states prevent double-submission
- [ ] Form re-opens after error (doesn't auto-collapse)
- [ ] Mobile tap targets are 44px minimum
- [ ] Animations are smooth (60fps)

## Performance Notes

- **Fresh data fetching**: Uses React Query's `useBatchTodo` with 30s stale time
- **Optimistic updates**: Handled by `useBatchActionRPC` mutation callbacks
- **Query invalidation**: All related queries invalidated after successful actions
- **No layout shift**: Forms have max-height to prevent content jumping
