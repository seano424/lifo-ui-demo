// components/store-users/pin-management-actions.tsx

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Key, RefreshCw, Unlock, Lock, Copy, Check, AlertTriangle, Mail } from 'lucide-react'
import { sendPinResetEmail, getEmailErrorMessage, type EmailSendResult } from '@/lib/email/client'

import { type StoreUser } from '@/lib/queries/store-users'

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
        toast.success('Email de réinitialisation PIN envoyé avec succès!')
      } else {
        const errorMessage = getEmailErrorMessage(result.error || 'Unknown error')
        setEmailStatus({
          sent: false,
          sending: false,
          error: errorMessage,
        })
        toast.error(`Échec de l'envoi de l'email: ${errorMessage}`)
      }
    } catch (error: any) {
      const errorMessage = getEmailErrorMessage(error.message || 'Unknown error')
      setEmailStatus({
        sent: false,
        sending: false,
        error: errorMessage,
      })
      toast.error(`Erreur lors de l'envoi: ${errorMessage}`)
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
        throw new Error(result?.error || 'Échec de la réinitialisation du PIN')
      }

      const credentials: ResetPINResult = {
        username: user.username || '',
        newPin: result.new_pin,
        email: user.email,
        full_name: user.full_name || '',
      }

      setResetResult(credentials)
      toast.success(`PIN réinitialisé pour ${user.full_name}`)
      onUserUpdated()

      // Automatically send reset email
      await sendResetEmail(credentials)
    } catch (error: any) {
      console.error('Error resetting PIN:', error)
      toast.error(error.message || 'Échec de la réinitialisation du PIN')
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
        throw new Error(result?.error || 'Échec du déverrouillage du PIN')
      }

      toast.success(`PIN déverrouillé pour ${user.full_name}`)
      onUserUpdated()
      setIsUnlockDialogOpen(false)
    } catch (error: any) {
      console.error('Error unlocking PIN:', error)
      toast.error(error.message || 'Échec du déverrouillage du PIN')
    } finally {
      setIsLoading(false)
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success(`${field} copié dans le presse-papier`)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      toast.error('Échec de la copie dans le presse-papier')
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
        Réinitialiser le PIN
      </DropdownMenuItem>

      {/* Unlock PIN (only if locked) */}
      {isPINLocked() && (
        <DropdownMenuItem
          onClick={() => setIsUnlockDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Unlock className="w-4 h-4" />
          Déverrouiller le PIN
        </DropdownMenuItem>
      )}

      {/* Reset PIN Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Réinitialiser le PIN pour {user.full_name}
            </DialogTitle>
            <DialogDescription>
              Ceci va générer un nouveau PIN et l'envoyer à l'employé par email. Son PIN actuel ne
              fonctionnera plus.
            </DialogDescription>
          </DialogHeader>

          {!resetResult ? (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>Employé :</strong> {user.full_name}
                    </div>
                    <div>
                      <strong>Nom d'utilisateur :</strong>{' '}
                      <span className="font-mono">{user.username}</span>
                    </div>
                    <div>
                      <strong>Email :</strong> {user.email}
                    </div>
                    <div>
                      <strong>Statut actuel :</strong>
                      {isPINLocked() ? (
                        <Badge variant="destructive" className="ml-2">
                          <Lock className="w-3 h-3 mr-1" />
                          Verrouillé
                        </Badge>
                      ) : (
                        <Badge variant="default" className="ml-2">
                          <Key className="w-3 h-3 mr-1" />
                          Actif
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
                  Annuler
                </Button>
                <Button
                  onClick={handleResetPIN}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Réinitialisation...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Réinitialiser le PIN
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
                    <AlertDescription>
                      Envoi de l'email de réinitialisation en cours...
                    </AlertDescription>
                  </>
                ) : emailStatus.sent ? (
                  <>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Email de réinitialisation envoyé avec succès à{' '}
                      <strong>{resetResult.email}</strong>
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
                        <div>Échec de l'envoi de l'email : {emailStatus.error}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={retryEmailSending}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Réessayer l'envoi
                        </Button>
                      </div>
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Email en cours de préparation pour <strong>{resetResult.email}</strong>
                    </AlertDescription>
                  </>
                )}
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Nouveau PIN</div>
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
                  Terminé
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
              Déverrouiller le PIN pour {user.full_name}
            </DialogTitle>
            <DialogDescription>
              Ceci va immédiatement déverrouiller le PIN de l'employé et remettre à zéro son
              compteur de tentatives échouées.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div>
                  <strong>Employé :</strong> {user.full_name}
                </div>
                <div>
                  <strong>Nom d'utilisateur :</strong>{' '}
                  <span className="font-mono">{user.username}</span>
                </div>
                <div>
                  <strong>Statut :</strong> Le compte est actuellement verrouillé à cause de
                  tentatives de PIN échouées
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
              Annuler
            </Button>
            <Button
              onClick={handleUnlockPIN}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Déverrouillage...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Déverrouiller le PIN
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
