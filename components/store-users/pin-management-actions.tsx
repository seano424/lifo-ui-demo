// components/store-users/pin-management-actions.tsx

'use client'

import { AlertTriangle, Check, Copy, Key, Lock, Mail, RefreshCw, Unlock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { type EmailSendResult, getEmailErrorMessage, sendPinResetEmail } from '@/lib/email/client'
import type { StoreUser } from '@/lib/queries/store-users'
import { createClient } from '@/lib/supabase/client'

interface PINManagementActionsProps {
  user: StoreUser
  onUserUpdated: () => void
}

interface ResetPINResult {
  username: string
  newPin: string
  email: string
  full_name: string
}

interface EmailStatus {
  sent: boolean
  sending: boolean
  error?: string
  messageId?: string
}

export function PINManagementActions({ user, onUserUpdated }: PINManagementActionsProps) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resetResult, setResetResult] = useState<ResetPINResult | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    sent: false,
    sending: false,
  })

  // Check if user's PIN is locked
  const isPINLocked = (): boolean => {
    const lockedUntil = user.pin_locked_until
    if (!lockedUntil) return false
    return new Date(lockedUntil) > new Date()
  }

  // Check if user has PIN enabled
  const hasPINAuth = (): boolean => {
    return user.can_use_pin_auth && !!user.requires_pin
  }

  // Send PIN reset email
  const sendResetEmail = async (credentials: ResetPINResult): Promise<void> => {
    setEmailStatus({ sent: false, sending: true })

    try {
      const result: EmailSendResult = await sendPinResetEmail({
        credentials: {
          username: credentials.username,
          pin: credentials.newPin,
          email: credentials.email,
          full_name: credentials.full_name,
        },
        storeId: user.store_id,
      })

      if (result.success) {
        setEmailStatus({
          sent: true,
          sending: false,
          messageId: result.messageId,
        })
        toast.success('PIN reset email sent successfully!')
      } else {
        const errorMessage = getEmailErrorMessage(result.error || 'Unknown error')
        setEmailStatus({
          sent: false,
          sending: false,
          error: errorMessage,
        })
        toast.error(`Failed to send email: ${errorMessage}`)
      }
    } catch (error: unknown) {
      const errorMessage = getEmailErrorMessage(
        error instanceof Error ? error.message : 'Unknown error',
      )
      setEmailStatus({
        sent: false,
        sending: false,
        error: errorMessage,
      })
      toast.error(`Error sending email: ${errorMessage}`)
    }
  }

  // Retry email sending
  const retryEmailSending = async (): Promise<void> => {
    if (resetResult) {
      await sendResetEmail(resetResult)
    }
  }

  // Reset user PIN
  const handleResetPIN = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data: result, error } = await supabase.rpc('reset_user_pin', {
        p_user_id: user.user_id,
      })

      if (error) throw error

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to reset PIN')
      }

      const credentials: ResetPINResult = {
        username: user.username || '',
        newPin: result.new_pin,
        email: user.email,
        full_name: user.full_name || '',
      }

      setResetResult(credentials)
      toast.success(`PIN reset for ${user.full_name}`)
      onUserUpdated()

      // Automatically send reset email
      await sendResetEmail(credentials)
    } catch (error: unknown) {
      console.error('Error resetting PIN:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reset PIN')
    } finally {
      setIsLoading(false)
    }
  }

  // Unlock user PIN
  const handleUnlockPIN = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data: result, error } = await supabase.rpc('unlock_user_pin', {
        p_user_id: user.user_id,
      })

      if (error) throw error

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to unlock PIN')
      }

      toast.success(`PIN unlocked for ${user.full_name}`)
      onUserUpdated()
      setIsUnlockDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error unlocking PIN:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to unlock PIN')
    } finally {
      setIsLoading(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success(`${field} copied to clipboard`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Only show PIN actions for employees with PIN auth
  if (!hasPINAuth()) {
    return null
  }

  return (
    <>
      <DropdownMenuSeparator />

      {/* Reset PIN */}
      <DropdownMenuItem
        onClick={() => setIsResetDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Reset PIN
      </DropdownMenuItem>

      {/* Unlock PIN (only if locked) */}
      {isPINLocked() && (
        <DropdownMenuItem
          onClick={() => setIsUnlockDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Unlock className="w-4 h-4" />
          Unlock PIN
        </DropdownMenuItem>
      )}

      {/* Reset PIN Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Reset PIN for {user.full_name}
            </DialogTitle>
            <DialogDescription>
              This will generate a new PIN and send it to the employee by email. Their current PIN
              will no longer work.
            </DialogDescription>
          </DialogHeader>

          {!resetResult ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>Employee:</strong> {user.full_name}
                    </div>
                    <div>
                      <strong>Username:</strong> <span className="font-mono">{user.username}</span>
                    </div>
                    <div>
                      <strong>Email:</strong> {user.email}
                    </div>
                    <div>
                      <strong>Current Status:</strong>
                      {isPINLocked() ? (
                        <Badge variant="destructive" className="ml-2">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      ) : (
                        <Badge variant="default" className="ml-2">
                          <Key className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsResetDialogOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPIN}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Reset PIN
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Email Status Alert */}
              <Alert>
                {emailStatus.sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription>Sending reset email...</AlertDescription>
                  </>
                ) : emailStatus.sent ? (
                  <>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Reset email sent successfully to <strong>{resetResult.email}</strong>
                      {emailStatus.messageId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          ID: {emailStatus.messageId}
                        </div>
                      )}
                    </AlertDescription>
                  </>
                ) : emailStatus.error ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <div>Failed to send email: {emailStatus.error}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={retryEmailSending}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Retry sending
                        </Button>
                      </div>
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Preparing email for <strong>{resetResult.email}</strong>
                    </AlertDescription>
                  </>
                )}
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">New PIN</div>
                    <div className="font-mono text-lg font-bold">{resetResult.newPin}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(resetResult.newPin, 'PIN')}
                  >
                    {copiedField === 'PIN' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setResetResult(null)
                    setEmailStatus({ sent: false, sending: false })
                    setIsResetDialogOpen(false)
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Unlock PIN Dialog */}
      <Dialog open={isUnlockDialogOpen} onOpenChange={setIsUnlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5" />
              Unlock PIN for {user.full_name}
            </DialogTitle>
            <DialogDescription>
              This will immediately unlock the employee&apos;s PIN and reset their failed attempts
              counter.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div>
                  <strong>Employee:</strong> {user.full_name}
                </div>
                <div>
                  <strong>Username:</strong> <span className="font-mono">{user.username}</span>
                </div>
                <div>
                  <strong>Status:</strong> The account is currently locked due to failed PIN
                  attempts
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUnlockDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnlockPIN}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Unlocking...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Unlock PIN
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
