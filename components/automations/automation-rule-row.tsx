import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Typography } from '@/components/ui/typography'
import { buttonVariants } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { AutomationRule } from '@/lib/queries/dashboard'

interface AutomationRuleRowProps {
  rule: AutomationRule
  onEdit: (rule: AutomationRule) => void
  onDelete: (rule: AutomationRule) => void
}

export function AutomationRuleRow({ rule, onEdit, onDelete }: AutomationRuleRowProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <tr
      className="group hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={() => !deleteOpen && onEdit(rule)}
    >
      {/* Rule name + type */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              rule.type === 'product' ? 'bg-green-500' : 'bg-primary',
            )}
          />
          <div>
            <Typography variant="p" className="font-medium text-foreground leading-none mb-0.5">
              {rule.name}
            </Typography>
            <Typography variant="small" color="muted">
              {rule.type === 'product' ? 'Product' : 'Category'} · {rule.products_count}{' '}
              {rule.products_count === 1 ? 'item' : 'items'}
            </Typography>
          </div>
        </div>
      </td>

      {/* Shelf life */}
      <td className="px-6 py-4">
        <Typography variant="p" className="text-foreground">
          {rule.shelf_life_days != null ? `${rule.shelf_life_days} days` : '—'}
        </Typography>
      </td>

      {/* Row actions — visible on hover */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            aria-label={`Edit ${rule.name}`}
            onClick={e => {
              e.stopPropagation()
              onEdit(rule)
            }}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild onClick={e => e.stopPropagation()}>
              <button
                type="button"
                aria-label={`Delete ${rule.name}`}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{rule.name}&rdquo; will be removed. Products in this {rule.type} will no
                  longer have shelf life automatically assigned.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: 'destructive' })}
                  onClick={() => onDelete(rule)}
                >
                  Delete rule
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </td>
    </tr>
  )
}
