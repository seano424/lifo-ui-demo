'use client'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { type EmailSendResult, getEmailErrorMessage, sendWelcomeEmail } from '@/lib/email/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  Crown,
  Key,
  Mail,
  RefreshCw,
  RotateCcw,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Typography } from '../ui/typography'

interface AddEmployeeDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  onEmployeeCreated: () => void
}

interface CreateEmployeeFormData {
  firstName: string
  lastName: string
  email: string
  username: string
  role: 'employee' | 'manager'
  languagePreference: 'en' | 'fr' | 'nl' | 'de' | 'es'
}

interface ExistingUserInfo {
  exists: boolean
  user_id?: string
  email?: string
  full_name?: string
  username?: string
  created_at?: string
}

interface CreatedCredentials {
  username: string
  password: string
  email: string
  full_name: string
  user_id: string
}

interface EmailStatus {
  sent: boolean
  sending: boolean
  error?: string
  messageId?: string
}

type FlowType = 'create_new' | 'invite_existing'

const LANGUAGE_OPTIONS = {
  fr: 'Français',
  en: 'English',
  nl: 'Nederlands',
} as const

export function AddEmployeeDialog({
  isOpen,
  onOpenChange,
  storeId,
  onEmployeeCreated,
}: AddEmployeeDialogProps) {
  const t = useTranslations('addEmployee')
  const tc = useTranslations('common.scanning')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [existingUser, setExistingUser] = useState<ExistingUserInfo | null>(null)
  const [flowType, setFlowType] = useState<FlowType>('create_new')
  const [step, setStep] = useState<'form' | 'credentials' | 'invitation_sent'>('form')
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    sent: false,
    sending: false,
  })

  const [formData, setFormData] = useState<CreateEmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    role: 'employee',
    languagePreference: 'en',
  })

  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)
  // const [copiedField, setCopiedField] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // Invalidate all store user queries and user stores for invited users
  const invalidateStoreUserQueries = () => {
    // Invalidate store-specific user queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.storeUsers.byStore(storeId),
    })

    queryClient.invalidateQueries({
      queryKey: queryKeys.storeUsers.infinite(storeId, {}),
    })

    queryClient.invalidateQueries({
      queryKey: queryKeys.storeUsers.employees(storeId),
    })

    queryClient.invalidateQueries({
      queryKey: queryKeys.storeUsers.managers(storeId),
    })

    // CRITICAL: Invalidate user stores for invited users so their store switcher updates
    if (existingUser?.user_id) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stores.userStores(existingUser.user_id),
      })
    }

    // Also invalidate all user store queries to handle any edge cases
    queryClient.invalidateQueries({
      queryKey: queryKeys.stores.all,
      predicate: query => query.queryKey.includes('userStores'),
    })
  }

  // Check if user exists by email
  const checkUserExists = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setExistingUser(null)
      setFlowType('create_new')
      return
    }

    setIsCheckingEmail(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc('check_user_exists_by_email', {
        p_email: email,
      })

      if (error) {
        console.error('Error checking user existence:', error)
        setExistingUser(null)
        setFlowType('create_new')
        return
      }

      if (data.exists) {
        setExistingUser(data)
        setFlowType('invite_existing')

        // Pre-fill name fields if we have the data
        if (data.full_name) {
          const [first, ...lastParts] = data.full_name.split(' ')
          setFormData(prev => ({
            ...prev,
            firstName: first || '',
            lastName: lastParts.join(' ') || '',
          }))
        }
      } else {
        setExistingUser(null)
        setFlowType('create_new')
      }
    } catch (error) {
      console.error('Error checking user existence:', error)
      setExistingUser(null)
      setFlowType('create_new')
    } finally {
      setIsCheckingEmail(false)
    }
  }, [])

  // Debounced email check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        checkUserExists(formData.email)
      }
    }, 800)

    return () => clearTimeout(timeoutId)
  }, [formData.email, checkUserExists])

  // Generate suggested username (first.last pattern)
  const generateSuggestedUsername = useCallback((firstName: string, lastName: string): string => {
    if (!firstName || !lastName) return ''
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '')
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '')
    return `${cleanFirst}.${cleanLast}`
  }, [])

  // Auto-update username when first/last name changes (only for new users)
  useEffect(() => {
    if (flowType === 'create_new' && formData.firstName && formData.lastName) {
      const suggested = generateSuggestedUsername(formData.firstName, formData.lastName)
      if (!formData.username || formData.username === suggested) {
        setFormData(prev => ({ ...prev, username: suggested }))
      }
    }
  }, [
    formData.firstName,
    formData.lastName,
    flowType,
    formData.username,
    generateSuggestedUsername,
  ])

  // Check username availability (only for new users)
  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      if (flowType !== 'create_new' || !username || username.length < 3) {
        setUsernameAvailable(null)
        return
      }

      setIsCheckingUsername(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('check_username_availability', {
          p_username: username,
        })

        if (error) {
          console.error('Username availability check error:', error)
          setUsernameAvailable(null)
          return
        }

        setUsernameAvailable(data)
      } catch (error) {
        console.error('Username availability check failed:', error)
        setUsernameAvailable(null)
      } finally {
        setIsCheckingUsername(false)
      }
    },
    [flowType],
  )

  // Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.username && flowType === 'create_new') {
        checkUsernameAvailability(formData.username)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.username, checkUsernameAvailability, flowType])

  // Generate secure password
  const generateSecurePassword = (): string => {
    const blockedPasswords = [
      '000000',
      '111111',
      '222222',
      '333333',
      '444444',
      '555555',
      '666666',
      '777777',
      '888888',
      '999999',
      '123456',
      '654321',
      '246810',
      '135790',
      '012345',
      '543210',
      '567890',
      '098765',
      '000001',
      '111122',
      '123123',
      '456456',
      '789789',
    ]
    let password: string
    do {
      password = Math.floor(100000 + Math.random() * 900000).toString()
    } while (blockedPasswords.includes(password))
    return password
  }

  // Send welcome email
  const sendEmployeeWelcomeEmail = async (credentials: CreatedCredentials): Promise<void> => {
    setEmailStatus({ sent: false, sending: true })

    try {
      const result: EmailSendResult = await sendWelcomeEmail({
        credentials: {
          username: credentials.username,
          password: credentials.password,
          email: credentials.email,
          full_name: credentials.full_name,
        },
        storeId,
      })

      if (result.success) {
        setEmailStatus({
          sent: true,
          sending: false,
          messageId: result.messageId,
        })
        toast.success(t('toast.emailSent'))
      } else {
        const errorMessage = getEmailErrorMessage(result.error || 'Unknown error')
        setEmailStatus({
          sent: false,
          sending: false,
          error: errorMessage,
        })
        toast.error(t('toast.emailFailed', { error: errorMessage }))
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
      toast.error(t('toast.emailError', { error: errorMessage }))
    }
  }

  // Handle create new employee
  const handleCreateNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.username) {
      toast.error(t('errors.fillFields'))
      return
    }

    if (usernameAvailable === false) {
      toast.error(t('errors.usernameTaken'))
      return
    }

    setIsLoading(true)

    try {
      const password = generateSecurePassword()

      const response = await fetch('/api/employees/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          role: formData.role,
          languagePreference: formData.languagePreference,
          storeId: storeId,
          password: password,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create employee')
      }

      const credentials: CreatedCredentials = {
        username: result.username,
        password: result.password,
        email: result.email,
        full_name: `${formData.firstName} ${formData.lastName}`,
        user_id: result.user_id,
      }

      setCreatedCredentials(credentials)
      setStep('credentials')
      toast.success(t('toast.created'))

      // Invalidate queries to refresh the UI
      invalidateStoreUserQueries()
      onEmployeeCreated()

      // Check if email looks fake and skip sending if so
      const isFakeEmail =
        formData.email.includes('test.com') ||
        formData.email.includes('fake.com') ||
        formData.email.includes('example.com')

      if (isFakeEmail) {
        setEmailStatus({
          sent: false,
          sending: false,
          error: 'Skipped sending to test email address',
        })
        toast.info(t('toast.emailSkipped'))
      } else {
        // Send credentials to their real email
        await sendEmployeeWelcomeEmail(credentials)
      }
    } catch (error: unknown) {
      console.error('Error creating employee:', error)
      toast.error(error instanceof Error ? error.message : t('errors.createFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle invite existing user
  const handleInviteExistingUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !existingUser?.user_id) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc('invite_user_to_store', {
        p_user_email: formData.email,
        p_store_id: storeId,
        p_role_in_store: formData.role,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data.success) {
        if (data.error === 'already_member') {
          toast.error(`User is already a ${data.existing_role} of this store`)
        } else {
          toast.error(data.message || 'Failed to invite user')
        }
        return
      }

      setStep('invitation_sent')
      toast.success(
        `${existingUser.full_name || existingUser.email} has been invited to your store!`,
      )

      // Invalidate queries to refresh the UI
      invalidateStoreUserQueries()
      onEmployeeCreated()
    } catch (error: unknown) {
      console.error('Error inviting user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to invite user')
    } finally {
      setIsLoading(false)
    }
  }

  // Copy to clipboard
  // const copyToClipboard = async (text: string, field: string) => {
  //   try {
  //     await navigator.clipboard.writeText(text)
  // setCopiedField(field)
  //     toast.success(t('toast.copied', { field }))
  // setTimeout(() => setCopiedField(null), 2000)
  //   } catch {
  //     toast.error(t('errors.copyFailed'))
  //   }
  // }

  // Reset form
  const resetForm = () => {
    setStep('form')
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      role: 'employee',
      languagePreference: 'en',
    })
    setExistingUser(null)
    setFlowType('create_new')
    setCreatedCredentials(null)
    // setCopiedField(null)
    setUsernameAvailable(null)
    setEmailStatus({ sent: false, sending: false })
  }

  // Handle dialog close
  const handleClose = () => {
    if (step === 'credentials' || step === 'invitation_sent') {
      invalidateStoreUserQueries()
      onEmployeeCreated()
    }

    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {flowType === 'invite_existing' ? (
                  <>
                    <UserCheck className="w-5 h-5" />
                    {t('title') || 'Invite Existing User'}
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    {t('title')}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                {flowType === 'invite_existing'
                  ? t('description') || 'Invite an existing LIFO user to join your store'
                  : t('description')}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={
                flowType === 'invite_existing' ? handleInviteExistingUser : handleCreateNewEmployee
              }
              className="space-y-4"
            >
              {/* Email Field - Always shown first */}
              <div>
                <Label htmlFor="email" required>
                  {t('form.email')}
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('form.emailPlaceholder')}
                    required
                    disabled={isLoading}
                  />
                  {isCheckingEmail && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;ll check if this user already exists
                </p>
              </div>

              {/* Existing User Info */}
              {existingUser && flowType === 'invite_existing' && (
                <Alert>
                  <UserCheck className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <strong>Existing User Found:</strong>
                        <Badge variant="secondary">
                          {existingUser.full_name || existingUser.email}
                        </Badge>
                      </div>
                      {existingUser.username && (
                        <div className="text-sm">
                          <strong>Username:</strong>{' '}
                          <code className="bg-muted px-1 rounded">{existingUser.username}</code>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        This user will be invited to join your store with the selected role.
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Name Fields - Required for new users, optional for existing */}
              {(flowType === 'create_new' || !existingUser?.full_name) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" required={flowType === 'create_new'}>
                      {t('form.firstName')}
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder={t('form.firstNamePlaceholder')}
                      required={flowType === 'create_new'}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" required={flowType === 'create_new'}>
                      {t('form.lastName')}
                    </Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder={t('form.lastNamePlaceholder')}
                      required={flowType === 'create_new'}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Username Field - Only for new users */}
              {flowType === 'create_new' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="username" required>
                      {t('form.username')}
                    </Label>
                    {formData.firstName && formData.lastName && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            username: generateSuggestedUsername(
                              formData.firstName,
                              formData.lastName,
                            ),
                          })
                        }
                        className="text-xs h-6 px-2"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        {t('form.reset')}
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          username: e.target.value.toLowerCase().replace(/[^a-z.]/g, ''),
                        })
                      }
                      placeholder={t('form.usernamePlaceholder')}
                      required
                      disabled={isLoading}
                      className={`pr-10 ${
                        usernameAvailable === true
                          ? 'border-primary-500'
                          : usernameAvailable === false
                            ? 'border-red-500'
                            : ''
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingUsername ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                      ) : usernameAvailable === true ? (
                        <Check className="w-4 h-4 text-primary-500" />
                      ) : usernameAvailable === false ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {usernameAvailable === false ? (
                      <span className="text-red-600">{t('form.usernameTaken')}</span>
                    ) : usernameAvailable === true ? (
                      <span className="text-primary-600">{t('form.usernameAvailable')}</span>
                    ) : (
                      t('form.usernameNote')
                    )}
                  </p>
                </div>
              )}

              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">{t('form.role')}</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'employee' | 'manager') =>
                      setFormData({ ...formData, role: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {t('roles.employee')}
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4" />
                          {t('roles.manager')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language Selection - Only for new users */}
                {flowType === 'create_new' && (
                  <div>
                    <Label htmlFor="language">{t('form.language')}</Label>
                    <Select
                      value={formData.languagePreference}
                      onValueChange={(value: 'en' | 'fr' | 'nl') =>
                        setFormData({ ...formData, languagePreference: value })
                      }
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LANGUAGE_OPTIONS).map(([code]) => (
                          <SelectItem key={code} value={code}>
                            {t(`languages.${code}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Preview for new users */}
              {flowType === 'create_new' && formData.username && (
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div>
                        <strong>{t('preview.username')}</strong>{' '}
                        <code className="bg-muted px-1 rounded">{formData.username}</code>
                      </div>
                      <div>
                        <strong>{t('preview.password')}</strong> {t('preview.passwordNote')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {t('preview.loginNote')}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="pt-6">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  {t('buttons.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isLoading ||
                    (flowType === 'create_new' &&
                      (usernameAvailable === false || !formData.username))
                  }
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {flowType === 'invite_existing' ? 'Inviting...' : t('buttons.creating')}
                    </>
                  ) : flowType === 'invite_existing' ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Send Invitation
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {t('buttons.create')}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : step === 'credentials' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary-600">
                <div className="text-center flex flex-col items-center gap-2">
                  <Check className="w-10 h-10 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
                  <Typography variant="h1">{t('success.title')}</Typography>
                </div>
              </DialogTitle>
              {/* <DialogDescription>
                {t('success.description', {
                  name: createdCredentials?.full_name || '',
                })}
              </DialogDescription> */}
            </DialogHeader>

            <div className="space-y-4 text-primary-600 text-center">
              {/* Email Status Alert */}
              <Alert>
                {emailStatus.sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription>{t('success.emailSending')}</AlertDescription>
                  </>
                ) : emailStatus.sent ? (
                  <AlertDescription>
                    {t('success.emailSent', {
                      email: createdCredentials?.email || '',
                    })}
                  </AlertDescription>
                ) : emailStatus.error ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {t('success.emailStatus', {
                        error: emailStatus.error || '',
                      })}
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      {t('success.emailPreparing', {
                        email: createdCredentials?.email || '',
                      })}
                    </AlertDescription>
                  </>
                )}
              </Alert>

              {/* <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-2xl">
                  <div>
                    <Label className="text-sm font-medium">
                      {t('credentials.email')}
                    </Label>
                    <div className="font-mono text-sm">
                      {createdCredentials?.email}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(createdCredentials?.email || '', 'Email')
                    }
                  >
                    {copiedField === 'Email' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-2xl">
                  <div>
                    <Label className="text-sm font-medium">
                      {t('credentials.username')}
                    </Label>
                    <div className="font-mono text-sm">
                      {createdCredentials?.username}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        createdCredentials?.username || '',
                        'Username'
                      )
                    }
                  >
                    {copiedField === 'Username' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-2xl">
                  <div>
                    <Label className="text-sm font-medium">
                      {t('credentials.pin')}
                    </Label>
                    <div className="font-mono text-lg font-bold">
                      {createdCredentials?.pin}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(createdCredentials?.pin || '', 'PIN')
                    }
                  >
                    {copiedField === 'PIN' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div> */}

              <Separator />

              {/* <div className="bg-blue-50 p-4 rounded-2xl">
                <h4 className="font-medium text-blue-900 mb-2">
                  {t('nextSteps.title')}
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>{t('nextSteps.loginTab')}</li>
                  <li>
                    {t('nextSteps.useCredentials', {
                      username: createdCredentials?.username || '',
                      pin: createdCredentials?.pin || '',
                    })}
                  </li>
                  <li>{t('nextSteps.resetPin')}</li>
                  <li>{t('nextSteps.permissions')}</li>
                </ul>
              </div> */}
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                {t('buttons.done')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary-600">
                <Check className="w-5 h-5" />
                Invitation Sent Successfully
              </DialogTitle>
              <DialogDescription>
                {existingUser?.full_name || formData.email} has been invited to join your store
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>User invited:</strong> {existingUser?.full_name || formData.email}
                    </div>
                    <div>
                      <strong>Role:</strong> <Badge variant="secondary">{formData.role}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      They will receive an email notification and can access your store immediately
                      using their existing login credentials.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 p-4 rounded-2xl">
                <h4 className="font-medium text-blue-900 mb-2">{tc('whatHappensNext')}</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• User receives an email notification about the invitation</li>
                  <li>• They can login with their existing LIFO credentials</li>
                  <li>• They&apos;ll see your store in their store selection menu</li>
                  <li>• You can manage their permissions from the team page</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
