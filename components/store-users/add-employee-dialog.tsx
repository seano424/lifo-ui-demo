// components/store-users/add-employee-dialog.tsx - FIXED username availability check

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { UserPlus, Key, Mail, Copy, Check, AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import { sendWelcomeEmail, getEmailErrorMessage, type EmailSendResult } from '@/lib/email/client'

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

interface CreatedCredentials {
  username: string
  pin: string
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

const LANGUAGE_OPTIONS = {
  fr: 'Français',
  en: 'English',
  nl: 'Nederlands',
  de: 'Deutsch',
  es: 'Español',
} as const

export function AddEmployeeDialog({
  isOpen,
  onOpenChange,
  storeId,
  onEmployeeCreated,
}: AddEmployeeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [step, setStep] = useState<'form' | 'credentials'>('form')
  const [formData, setFormData] = useState<CreateEmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    role: 'employee',
    languagePreference: 'en',
  })
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [emailStatus, setEmailStatus] = useState<EmailStatus>({
    sent: false,
    sending: false,
  })

  const queryClient = useQueryClient()

  // Generate suggested username (first.last pattern)
  const generateSuggestedUsername = (firstName: string, lastName: string): string => {
    if (!firstName || !lastName) return ''
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '')
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '')
    return `${cleanFirst}.${cleanLast}`
  }

  // Auto-update username when first/last name changes
  useEffect(() => {
    if (formData.firstName && formData.lastName) {
      const suggested = generateSuggestedUsername(formData.firstName, formData.lastName)

      // Only auto-update if username is empty or still matches the old suggestion
      const currentSuggestion = generateSuggestedUsername(formData.firstName, formData.lastName)
      if (!formData.username || formData.username === currentSuggestion) {
        setFormData(prev => ({ ...prev, username: suggested }))
      }
    }
  }, [formData.firstName, formData.lastName])

  // ✅ FIXED: Check username availability using RPC function
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setIsCheckingUsername(true)
    try {
      const supabase = createClient()

      console.log(`🔍 Checking username availability for: "${username}"`)

      // ✅ Use RPC function instead of direct auth.users query
      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: username,
      })

      if (error) {
        console.error('❌ Username availability check error:', error)
        setUsernameAvailable(null)
        toast.error('Failed to check username availability')
        return
      }

      // data is boolean: true = available, false = taken
      setUsernameAvailable(data)

      console.log(`✅ Username "${username}" availability:`, data ? 'Available ✅' : 'Taken ❌')
    } catch (error) {
      console.error('❌ Username availability check failed:', error)
      setUsernameAvailable(null)
      toast.error('Failed to check username availability')
    } finally {
      setIsCheckingUsername(false)
    }
  }

  // Debounced username check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.username) {
        checkUsernameAvailability(formData.username)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData.username])

  // Generate secure PIN
  const generateSecurePIN = (): string => {
    const blockedPins = [
      '0000',
      '1111',
      '2222',
      '3333',
      '4444',
      '5555',
      '6666',
      '7777',
      '8888',
      '9999',
      '1234',
      '4321',
      '2468',
      '8642',
      '1357',
      '9753',
      '0123',
      '3210',
      '5678',
      '8765',
    ]
    let pin: string
    do {
      pin = Math.floor(1000 + Math.random() * 9000).toString()
    } while (blockedPins.includes(pin))
    return pin
  }

  // Send welcome email
  const sendEmployeeWelcomeEmail = async (credentials: CreatedCredentials): Promise<void> => {
    setEmailStatus({ sent: false, sending: true })

    try {
      const result: EmailSendResult = await sendWelcomeEmail({
        credentials: {
          username: credentials.username,
          pin: credentials.pin,
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
        toast.success('Welcome email sent successfully!')
      } else {
        const errorMessage = getEmailErrorMessage(result.error || 'Unknown error')
        setEmailStatus({
          sent: false,
          sending: false,
          error: errorMessage,
        })
        toast.error(`Failed to send email: ${errorMessage}`)
      }
    } catch (error: any) {
      const errorMessage = getEmailErrorMessage(error.message || 'Unknown error')
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
    if (createdCredentials) {
      await sendEmployeeWelcomeEmail(createdCredentials)
    }
  }

  // Reset username to suggestion
  const resetToSuggestedUsername = () => {
    const suggested = generateSuggestedUsername(formData.firstName, formData.lastName)
    setFormData(prev => ({ ...prev, username: suggested }))
  }

  // Invalidate all store user queries
  const invalidateStoreUserQueries = () => {
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

    console.log('✅ Invalidated store user queries for store:', storeId)
  }

  // ✅ FIXED: Handle form submission using server-side Admin API
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.username) {
      toast.error('Please fill in all required fields')
      return
    }

    if (usernameAvailable === false) {
      toast.error('Username is already taken. Please choose a different one.')
      return
    }

    if (!storeId) {
      toast.error('No store selected')
      return
    }

    setIsLoading(true)

    try {
      const pin = generateSecurePIN()

      console.log('🎯 Creating employee via server API:', {
        username: formData.username,
        pin: pin,
        storeId,
      })

      // Call server-side API that uses Admin API with proper permissions
      const response = await fetch('/api/employees/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          role: formData.role,
          languagePreference: formData.languagePreference,
          storeId: storeId,
          pin: pin,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('❌ Server API error:', result.error)
        throw new Error(result.error || 'Failed to create employee')
      }

      console.log('✅ Employee created successfully:', result)

      // Store credentials for display and email
      const credentials: CreatedCredentials = {
        username: result.username,
        pin: result.pin,
        email: result.email, // Contact email for display/notifications
        full_name: `${formData.firstName} ${formData.lastName}`,
        user_id: result.user_id,
      }

      setCreatedCredentials(credentials)
      setStep('credentials')
      toast.success('Employee created successfully using server API!')

      // Invalidate queries immediately after creation
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
        toast.info('Employee created! Email skipped for test address.')
      } else {
        // Send credentials to their real email
        await sendEmployeeWelcomeEmail(credentials)
      }
    } catch (error: any) {
      console.error('❌ Error creating employee:', error)
      toast.error(error.message || 'Failed to create employee')
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
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  // Handle dialog close
  const handleClose = () => {
    if (step === 'credentials') {
      invalidateStoreUserQueries()
      onEmployeeCreated()
    }

    // Reset form state
    setStep('form')
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      role: 'employee',
      languagePreference: 'en',
    })
    setCreatedCredentials(null)
    setCopiedField(null)
    setEmailStatus({ sent: false, sending: false })
    setUsernameAvailable(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new employee account with PIN authentication. Login credentials will be
                sent by email.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" required>
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName" required>
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" required>
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="test@example.com (use fake email for testing)"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use test@example.com for testing. Real emails will receive login credentials.
                </p>
              </div>

              {/* ✅ FIXED: Username Input with Availability Check using RPC */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="username" required>
                    Username
                  </Label>
                  {formData.firstName && formData.lastName && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetToSuggestedUsername}
                      className="text-xs h-6 px-2"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reset
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
                    placeholder="john.doe"
                    required
                    disabled={isLoading}
                    className={`pr-10 ${
                      usernameAvailable === true
                        ? 'border-green-500'
                        : usernameAvailable === false
                          ? 'border-red-500'
                          : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername ? (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                    ) : usernameAvailable === true ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {usernameAvailable === false ? (
                    <span className="text-red-600">Username is already taken</span>
                  ) : usernameAvailable === true ? (
                    <span className="text-green-600">Username is available</span>
                  ) : (
                    'Employee will use this username to log in'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
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
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.languagePreference}
                    onValueChange={(value: any) =>
                      setFormData({ ...formData, languagePreference: value })
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LANGUAGE_OPTIONS).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.username && (
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div>
                        <strong>Username:</strong>{' '}
                        <span className="font-mono">{formData.username}</span>
                      </div>
                      <div>
                        <strong>PIN:</strong> Will be generated automatically (4 digits)
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        The employee can log in using the "Employee" tab with their username and PIN
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || usernameAvailable === false || !formData.username}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Employee
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <Check className="w-5 h-5" />
                Employee Created Successfully!
              </DialogTitle>
              <DialogDescription>
                {createdCredentials?.full_name} has been added to your store. Save these credentials
                and share them with the employee.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Email Status Alert */}
              <Alert>
                {emailStatus.sending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <AlertDescription>Sending email...</AlertDescription>
                  </>
                ) : emailStatus.sent ? (
                  <>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Welcome email sent successfully to{' '}
                      <strong>{createdCredentials?.email}</strong>
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
                        <div>Email status: {emailStatus.error}</div>
                        {!emailStatus.error.includes('test') &&
                          !emailStatus.error.includes('Skipped') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={retryEmailSending}
                              className="flex items-center gap-2"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Retry sending
                            </Button>
                          )}
                      </div>
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Preparing email for <strong>{createdCredentials?.email}</strong>
                    </AlertDescription>
                  </>
                )}
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <div className="font-mono text-sm">{createdCredentials?.email}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(createdCredentials?.email || '', 'Email')}
                  >
                    {copiedField === 'Email' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Username</Label>
                    <div className="font-mono text-sm">{createdCredentials?.username}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(createdCredentials?.username || '', 'Username')}
                  >
                    {copiedField === 'Username' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">PIN</Label>
                    <div className="font-mono text-lg font-bold">{createdCredentials?.pin}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(createdCredentials?.pin || '', 'PIN')}
                  >
                    {copiedField === 'PIN' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• The employee can log in using the "Employee" tab on the login page</li>
                  <li>
                    • Use username: <strong>{createdCredentials?.username}</strong> and PIN:{' '}
                    <strong>{createdCredentials?.pin}</strong>
                  </li>
                  <li>• The PIN can be reset at any time from the team management page</li>
                  <li>• The employee can scan products and manage basic inventory</li>
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
