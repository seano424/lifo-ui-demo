import React, { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'

import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  useCurrentUser,
  useUpdateLanguagePreference,
  useUpdatePhone,
  useUserActions,
} from '@/hooks/use-users'
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  isValidPhoneNumber,
  formatPhoneNumber,
} from '@/lib/types/user'
import { Edit, Check, X, AlertCircle } from 'lucide-react'

export default function UserAccountInformation() {
  const { data: user, isLoading } = useCurrentUser()

  console.log('user', user)
  const updateLanguage = useUpdateLanguagePreference()
  const updatePhone = useUpdatePhone()
  const { updateUserProfile } = useUserActions()

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [isEditingLanguage, setIsEditingLanguage] = useState(false)

  // Form states
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
  })
  const [phoneForm, setPhoneForm] = useState('')
  const [languageForm, setLanguageForm] = useState<SupportedLanguage>('en')

  // Error states
  const [phoneError, setPhoneError] = useState('')
  const [profileError, setProfileError] = useState('')

  React.useEffect(() => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        email: user.email || '',
      })
      setPhoneForm(user.phone || '')
      setLanguageForm(user.language_preference || 'en')
    }
  }, [user])

  const handleProfileSubmit = async () => {
    if (!user) return

    setProfileError('')

    try {
      await updateUserProfile(user.id, {
        full_name: editForm.full_name,
        email: editForm.email,
      })
      setIsEditingProfile(false)
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Failed to update profile')
    }
  }

  const handlePhoneSubmit = async () => {
    if (!user) return

    setPhoneError('')

    // Validate phone number
    if (phoneForm && !isValidPhoneNumber(phoneForm)) {
      setPhoneError('Please enter a valid phone number')
      return
    }

    try {
      await updatePhone.mutateAsync({
        userId: user.id,
        phone: phoneForm || null,
      })
      setIsEditingPhone(false)
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : 'Failed to update phone number')
    }
  }

  const handleLanguageSubmit = async () => {
    if (!user) return

    try {
      await updateLanguage.mutateAsync({
        userId: user.id,
        language: languageForm,
      })
      setIsEditingLanguage(false)
    } catch (error) {
      console.error('Failed to update language:', error)
    }
  }

  const resetProfileForm = () => {
    if (user) {
      setEditForm({
        full_name: user.full_name || '',
        email: user.email || '',
      })
    }
    setProfileError('')
    setIsEditingProfile(false)
  }

  const resetPhoneForm = () => {
    setPhoneForm(user?.phone || '')
    setPhoneError('')
    setIsEditingPhone(false)
  }

  const resetLanguageForm = () => {
    setLanguageForm(user?.language_preference || 'en')
    setIsEditingLanguage(false)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 border border-gray-50 rounded-2xl p-4">
        <Skeleton className="w-full h-10 bg-gray-50" />
        <Skeleton className="w-full h-10 bg-gray-50" />
        <Skeleton className="w-full h-10 bg-gray-50" />
        <Skeleton className="w-full h-10 bg-gray-50" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col">
          <Typography variant="h2">Account Information</Typography>
          <Typography variant="p" color="muted">
            Manage your account settings and preferences.
          </Typography>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-4 border-t">
        {/* Profile Information Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="flex items-center gap-2">
              Profile Information
            </Typography>
            {!isEditingProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>

          {isEditingProfile ? (
            <div className="space-y-4 p-4 border rounded-lg">
              {profileError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{profileError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email address"
                  />
                </div> */}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleProfileSubmit}
                  // disabled={updateUserProfile}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={resetProfileForm}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  Full Name
                </Typography>
                <Typography variant="p">{user?.full_name || 'No name'}</Typography>
              </div>

              {/* <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  Email Address
                </Typography>
                <Typography variant="p" className="flex items-center gap-2">
                  {user?.email || 'No email'}
                </Typography>
              </div> */}
              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  Email Address
                </Typography>
                <Typography variant="p">{user?.email || 'No email'}</Typography>
                <Typography variant="small" className="text-muted-foreground mt-1">
                  Email cannot be changed. Contact support if needed.
                </Typography>
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="flex items-center gap-2">
              Phone Number
            </Typography>
            {!isEditingPhone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingPhone(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>

          {isEditingPhone ? (
            <div className="space-y-4 p-4 border rounded-lg">
              {phoneError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{phoneError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneForm}
                  onChange={e => setPhoneForm(e.target.value)}
                  placeholder="+33 1 23 45 67 89"
                />
                <Typography variant="small" className="text-muted-foreground">
                  Enter your phone number with country code (optional)
                </Typography>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePhoneSubmit}
                  disabled={updatePhone.isPending}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {updatePhone.isPending ? 'Saving...' : 'Save Phone'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetPhoneForm}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Typography variant="p" className="flex items-center gap-2">
                {user?.phone ? formatPhoneNumber(user.phone) : 'No phone number set'}
              </Typography>
              {!user?.phone && (
                <Typography variant="small" className="text-muted-foreground mt-1">
                  Add a phone number for account security and notifications
                </Typography>
              )}
            </div>
          )}
        </div>

        {/* Language Preference Section */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="flex items-center gap-2">
              Language Preference
            </Typography>
            {!isEditingLanguage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingLanguage(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>

          {isEditingLanguage ? (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="language">Display Language</Label>
                <Select
                  value={languageForm}
                  onValueChange={(value: SupportedLanguage) => setLanguageForm(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Typography variant="small" className="text-muted-foreground">
                  Choose your preferred language for the interface
                </Typography>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleLanguageSubmit}
                  disabled={updateLanguage.isPending}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {updateLanguage.isPending ? 'Saving...' : 'Save Language'}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetLanguageForm}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                {SUPPORTED_LANGUAGES[user?.language_preference || 'en']}
              </span>
            </div>
          )}
        </div>

        {/* Account Status Section */}
        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h3">Account Status</Typography>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Typography variant="small" className="font-medium text-muted-foreground">
                Status:
              </Typography>
              <span className="flex items-center gap-1">
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Typography variant="small" className="font-medium text-muted-foreground">
                Email Verified:
              </Typography>
              <span className="flex items-center gap-1">
                {user?.email_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Typography variant="small" className="font-medium text-muted-foreground">
                Phone Verified:
              </Typography>
              <span className="flex items-center gap-1">
                {user?.phone_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
