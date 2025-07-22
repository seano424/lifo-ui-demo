import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCurrentUser, useUpdatePhone, useUserActions } from '@/hooks/use-users'
import { isValidPhoneNumber, formatPhoneNumber } from '@/lib/types/user'
import { Edit, Check, X, AlertCircle } from 'lucide-react'
import { LanguageSwitcher } from '../ui/language-switcher'

export default function UserAccountInformation() {
  const t = useTranslations('account')
  const { data: user, isLoading } = useCurrentUser()

  const updatePhone = useUpdatePhone()
  const { updateUserProfile } = useUserActions()

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingPhone, setIsEditingPhone] = useState(false)

  // Form states
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
  })
  const [phoneForm, setPhoneForm] = useState('')

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
      setProfileError(error instanceof Error ? error.message : t('errors.updateProfile'))
    }
  }

  const handlePhoneSubmit = async () => {
    if (!user) return

    setPhoneError('')

    // Validate phone number
    if (phoneForm && !isValidPhoneNumber(phoneForm)) {
      setPhoneError(t('phone.invalidPhone'))
      return
    }

    try {
      await updatePhone.mutateAsync({
        userId: user.id,
        phone: phoneForm || null,
      })
      setIsEditingPhone(false)
    } catch (error) {
      setPhoneError(error instanceof Error ? error.message : t('errors.updatePhone'))
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
          <Typography variant="h2">{t('title')}</Typography>
          <Typography variant="p" color="muted">
            {t('description')}
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
                {t('profile.edit')}
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
                  {t('profile.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  {t('profile.fullName')}
                </Typography>
                <Typography variant="p">{user?.full_name || t('profile.noName')}</Typography>
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
                  {t('profile.email')}
                </Typography>
                <Typography variant="p">{user?.email || t('profile.noEmail')}</Typography>
                <Typography variant="small" className="text-muted-foreground mt-1">
                  {t('profile.emailNotice')}
                </Typography>
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="flex items-center gap-2">
              {t('phone.title')}
            </Typography>
            {!isEditingPhone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingPhone(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                {t('phone.edit')}
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
                <Label htmlFor="phone">{t('phone.label')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneForm}
                  onChange={e => setPhoneForm(e.target.value)}
                  placeholder={t('phone.placeholder')}
                />
                <Typography variant="small" className="text-muted-foreground">
                  {t('phone.description')}
                </Typography>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePhoneSubmit}
                  disabled={updatePhone.isPending}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {updatePhone.isPending ? t('phone.saving') : t('phone.save')}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetPhoneForm}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  {t('phone.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Typography variant="p" className="flex items-center gap-2">
                {user?.phone ? formatPhoneNumber(user.phone) : t('phone.noPhone')}
              </Typography>
              {!user?.phone && (
                <Typography variant="small" className="text-muted-foreground mt-1">
                  {t('phone.addNotice')}
                </Typography>
              )}
            </div>
          )}
        </div>

        {/* Language Preference Section */}
        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h3" className="flex items-center gap-2">
            {t('language.title')}
          </Typography>

          <Typography variant="p" className="flex items-center gap-2">
            {t('language.description')}
          </Typography>
          <LanguageSwitcher />
        </div>

        {/* Account Status Section */}
        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h3">{t('status.title')}</Typography>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Typography variant="small" className="font-medium text-muted-foreground">
                {t('status.accountStatus')}
              </Typography>
              <span className="flex items-center gap-1">
                {user?.is_active ? t('status.active') : t('status.inactive')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Typography variant="small" className="font-medium text-muted-foreground">
                {t('status.emailVerified')}
              </Typography>
              <span className="flex items-center gap-1">
                {user?.email_verified ? t('status.verified') : t('status.unverified')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Typography variant="small" className="font-medium text-muted-foreground">
                {t('status.phoneVerified')}
              </Typography>
              <span className="flex items-center gap-1">
                {user?.phone_verified ? t('status.verified') : t('status.unverified')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
