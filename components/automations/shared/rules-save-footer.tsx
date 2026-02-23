import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'

interface RulesSaveFooterProps {
  onSave: () => void
  isSaving: boolean
  disabled?: boolean
  label: string
  helperText?: string
}

export function RulesSaveFooter({
  onSave,
  isSaving,
  disabled,
  label,
  helperText,
}: RulesSaveFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
      {helperText && (
        <Typography variant="small" color="muted">
          {helperText}
        </Typography>
      )}
      <Button
        onClick={onSave}
        disabled={isSaving || disabled}
        className="bg-secondary hover:bg-secondary/90 shadow-[0_2px_8px_rgba(80,36,255,0.2)] hover:shadow-[0_4px_16px_rgba(80,36,255,0.3)] hover:-translate-y-px transition-all"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving…
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  )
}
