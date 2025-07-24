'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser, useUpdatePhone, useUserActions } from '@/hooks/use-users'
import { isValidPhoneNumber, formatPhoneNumber } from '@/lib/types/user'
import { Edit, Check, X, AlertCircle, User, Phone, Globe, Shield, Clock } from 'lucide-react'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

const createProfileSchema = (t: (key: string) => string) =>
  z.object({
    full_name: z
      .string()
      .min(1, t('profile.validation.nameRequired'))
      .max(100, t('profile.validation.nameTooLong')),
    username: z
      .string()
      .min(2, t('profile.validation.usernameRequired'))
      .max(50, t('profile.validation.usernameTooLong'))
      .regex(/^[a-zA-Z0-9_]+$/, t('profile.validation.usernameInvalid'))
      .optional(),
  })

type ProfileFormData = z.infer<ReturnType<typeof createProfileSchema>>

export default function UserAccountInformation() {
  const t = useTranslations('account')
  const { data: user, isLoading } = useCurrentUser()

  const updatePhone = useUpdatePhone()
  const { updateUserProfile } = useUserActions()

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingPhone, setIsEditingPhone] = useState(false)

  const [phoneForm, setPhoneForm] = useState('')
  const [phoneError, setPhoneError] = useState('')

  const profileSchema = createProfileSchema(t)
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      username: '',
    },
  })

  useEffect(() => {
    if (user) {
      profileForm.reset({
        full_name: user.full_name || '',
        username: user.username || '',
      })
      setPhoneForm(user.phone || '')
    }
  }, [user, profileForm])

  const handleProfileSubmit = async (data: ProfileFormData) => {
    if (!user) return

    try {
      await updateUserProfile(user.id, {
        full_name: data.full_name,
        username: data.username,
      })
      setIsEditingProfile(false)
    } catch (error) {
      console.error('Profile update error:', error)
    }
  }

  const handlePhoneSubmit = async () => {
    if (!user) return

    setPhoneError('')

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
      profileForm.reset({
        full_name: user.full_name || '',
        username: user.username || '',
      })
    }
    setIsEditingProfile(false)
  }

  const resetPhoneForm = () => {
    setPhoneForm(user?.phone || '')
    setPhoneError('')
    setIsEditingPhone(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load account information. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h2" className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('title')}
            </Typography>
            <Typography variant="p" color="muted">
              {t('description')}
            </Typography>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-4 border-t">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('profile.title')}
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
            <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{t('profile.fullName')}</Label>
                    <Input
                      id="full_name"
                      {...profileForm.register('full_name')}
                      placeholder={t('profile.placeholders.fullName')}
                    />
                    {profileForm.formState.errors.full_name && (
                      <Typography variant="small" className="text-destructive">
                        {profileForm.formState.errors.full_name.message}
                      </Typography>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">{t('profile.username')}</Label>
                    <Input
                      id="username"
                      {...profileForm.register('username')}
                      placeholder={t('profile.placeholders.username')}
                      className="font-mono"
                    />
                    {profileForm.formState.errors.username && (
                      <Typography variant="small" className="text-destructive">
                        {profileForm.formState.errors.username.message}
                      </Typography>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={profileForm.formState.isSubmitting}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {profileForm.formState.isSubmitting
                      ? t('profile.saving')
                      : t('profile.saveChanges')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetProfileForm}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    {t('profile.cancel')}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  {t('profile.fullName')}
                </Typography>
                <Typography variant="p">{user.full_name || t('profile.noName')}</Typography>
              </div>

              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  {t('profile.username')}
                </Typography>
                <Typography variant="p" className="font-mono">
                  {user.username || t('profile.noUsername')}
                </Typography>
              </div>

              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  {t('profile.email')}
                </Typography>
                <Typography variant="p">{user.email}</Typography>
                <Typography variant="small" className="text-muted-foreground mt-1">
                  {t('profile.emailNotice')}
                </Typography>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Typography variant="h3" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
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
                {user.phone ? formatPhoneNumber(user.phone) : t('phone.noPhone')}
                {user.phone_verified && (
                  <span className="text-green-600 text-sm">✓ {t('phone.verified')}</span>
                )}
              </Typography>
              {!user.phone && (
                <Typography variant="small" className="text-muted-foreground mt-1">
                  {t('phone.addNotice')}
                </Typography>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h3" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('language.title')}
          </Typography>

          <div className="flex items-center justify-between">
            <div>
              <Typography variant="p">{t('language.description')}</Typography>
              <Typography variant="small" className="text-muted-foreground mt-1">
                {t('language.currentLanguage')}: {user.language_preference?.toUpperCase() || 'EN'}
              </Typography>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h3" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('status.title')}
          </Typography>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  {t('status.accountStatus')}
                </Typography>
                <Typography variant="p">
                  {user.is_active ? t('status.active') : t('status.inactive')}
                </Typography>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  {t('status.emailVerified')}
                </Typography>
                <Typography variant="p">
                  {user.email_verified ? t('status.verified') : t('status.unverified')}
                </Typography>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${user.email_verified ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Typography variant="small" className="font-medium text-muted-foreground">
                  {t('status.phoneVerified')}
                </Typography>
                <Typography variant="p">
                  {user.phone_verified ? t('status.verified') : t('status.unverified')}
                </Typography>
              </div>
              <div
                className={`w-3 h-3 rounded-full ${user.phone_verified ? 'bg-green-500' : 'bg-yellow-500'}`}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h3" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t('activity.title')}
          </Typography>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Typography variant="small" className="font-medium text-muted-foreground">
                {t('activity.memberSince', {
                  date: new Date(user.created_at).toLocaleDateString(),
                })}
              </Typography>
              <Typography variant="p">{new Date(user.created_at).toLocaleDateString()}</Typography>
            </div>

            <div>
              <Typography variant="small" className="font-medium text-muted-foreground">
                {t('activity.lastLogin', { date: new Date(user.last_login).toLocaleDateString() })}
              </Typography>
              <Typography variant="p">
                {user.last_login
                  ? new Date(user.last_login).toLocaleDateString()
                  : t('activity.neverLoggedIn')}
              </Typography>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>{t('security.notice')}</AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  )
}
