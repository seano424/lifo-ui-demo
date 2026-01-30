'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Skeleton } from '@/components/ui/skeleton'
// Dark mode is currently disabled - controlled by NEXT_PUBLIC_ENABLE_DARK_MODE=false in .env
// Uncomment when dark mode feature is re-enabled
// import { ThemeSwitcherSelect } from '@/components/ui/theme-switcher-select'
import { Typography } from '@/components/ui/typography'
import { useCurrentUser, useUpdatePhone, useUserActions } from '@/hooks/use-users'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/types/user'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Check, Edit, Shield, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
// Dark mode is currently disabled - controlled by NEXT_PUBLIC_ENABLE_DARK_MODE=false in .env
// Uncomment when dark mode feature is re-enabled
// import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
  // Dark mode is currently disabled - controlled by NEXT_PUBLIC_ENABLE_DARK_MODE=false in .env
  // Uncomment when dark mode feature is re-enabled
  // const { theme } = useTheme()
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

  // Dark mode is currently disabled - controlled by NEXT_PUBLIC_ENABLE_DARK_MODE=false in .env
  // Uncomment when dark mode feature is re-enabled
  // const getCurrentThemeDisplay = () => {
  //   switch (theme) {
  //     case 'light':
  //       return t('theme.light')
  //     case 'dark':
  //       return t('theme.dark')
  //     case 'system':
  //       return t('theme.system')
  //   }
  // }

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
              <div key={`skeleton-${i + 1}`} className="flex flex-col gap-2">
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
    <Card className="shadow-primary-300 border-t-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h3">{t('title')}</Typography>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-4 border-t">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Typography variant="h4">{t('profile.title')}</Typography>
            {!isEditingProfile && (
              <Button
                variant="subtleSecondary"
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
            <form
              onSubmit={profileForm.handleSubmit(handleProfileSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="space-y-4 p-4 border rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="full_name">{t('profile.fullName')}</Label>
                    <Input
                      id="full_name"
                      {...profileForm.register('full_name')}
                      placeholder={t('profile.placeholders.fullName')}
                    />
                    {profileForm.formState.errors.full_name && (
                      <Typography variant="p" className="text-destructive">
                        {profileForm.formState.errors.full_name.message}
                      </Typography>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="username">{t('profile.username')}</Label>
                    <Input
                      id="username"
                      {...profileForm.register('username')}
                      placeholder={t('profile.placeholders.username')}
                    />
                    {profileForm.formState.errors.username && (
                      <Typography variant="p" className="text-destructive">
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
              <div className="flex flex-col gap-2">
                <Typography variant="p">{t('profile.fullName')}</Typography>
                <Typography variant="p">{user.full_name || t('profile.noName')}</Typography>
              </div>

              <div className="flex flex-col gap-2">
                <Typography variant="p">{t('profile.username')}</Typography>
                <Typography variant="p">{user.username || t('profile.noUsername')}</Typography>
              </div>

              <div className="flex flex-col gap-2">
                <Typography variant="p">{t('profile.email')}</Typography>
                <Typography variant="p">{user.email}</Typography>
                <Typography className="mt-1 text-primary-800" variant="p">
                  {t('profile.emailNotice')}
                </Typography>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Typography variant="h4">{t('phone.title')}</Typography>
            {!isEditingPhone && (
              <Button
                variant="subtleSecondary"
                size="sm" // Ajout de size="sm"
                onClick={() => setIsEditingPhone(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                {t('phone.edit')}
              </Button>
            )}
          </div>

          {isEditingPhone ? (
            <div className="space-y-4 p-4 border rounded-2xl">
              {phoneError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{phoneError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">{t('phone.label')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneForm}
                  onChange={e => setPhoneForm(e.target.value)}
                  placeholder={t('phone.placeholder')}
                />
                <Typography variant="p">{t('phone.description')}</Typography>
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
            <div className="flex flex-col gap-2">
              <Typography variant="p" className="flex items-center gap-2">
                {user.phone ? formatPhoneNumber(user.phone) : t('phone.noPhone')}
                {user.phone_verified && (
                  <span className="text-primary-800 text-sm">✓ {t('phone.verified')}</span>
                )}
              </Typography>
              {!user.phone && (
                <Typography variant="p" className="text-muted-foreground mt-1">
                  {t('phone.addNotice')}
                </Typography>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h4">{t('language.title')}</Typography>

          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col gap-2">
              <Typography variant="p">{t('language.description')}</Typography>
              <Typography variant="p">
                {t('language.currentLanguage')}: {user.language_preference?.toUpperCase() || 'EN'}
              </Typography>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h4">{t('status.title')}</Typography>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div className="flex items-center justify-between p-3 border rounded-2xl">
              <div className="flex items-center justify-between w-full gap-2">
                <Typography variant="p">{t('status.accountStatus')}</Typography>
                <div className="flex items-center gap-2">
                  <Typography variant="p">
                    {user.is_active ? t('status.active') : t('status.inactive')}
                  </Typography>
                  <div
                    className={`w-3 h-3 rounded-full ${user.is_active ? 'bg-primary-500' : 'bg-destructive'}`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-2xl">
              <div className="flex items-center justify-between w-full gap-2">
                <Typography variant="p">{t('status.emailVerified')}</Typography>
                <div className="flex items-center gap-2">
                  <Typography variant="p">
                    {user.email_verified ? t('status.verified') : t('status.unverified')}
                  </Typography>
                  <div
                    className={`w-3 h-3 rounded-full ${user.email_verified ? 'bg-primary-500' : 'bg-primary'}`}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-2xl">
              <div className="flex items-center justify-between w-full gap-2">
                <Typography variant="p">{t('status.phoneVerified')}</Typography>
                <div className="flex items-center gap-2">
                  <Typography variant="p">
                    {user.phone_verified ? t('status.verified') : t('status.unverified')}
                  </Typography>
                  <div
                    className={`w-3 h-3 rounded-full ${user.phone_verified ? 'bg-primary-500' : 'bg-primary'}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <Typography variant="h4">{t('activity.title')}</Typography>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 mt-2">
              <Typography variant="p">
                {t('activity.memberSince', {
                  date: new Date(user.created_at).toLocaleDateString(),
                })}
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
