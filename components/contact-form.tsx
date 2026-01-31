'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function ContactForm() {
  const t = useTranslations('contactpage.form')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const [status, setStatus] = useState({
    loading: false,
    success: false,
    error: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus({ loading: true, success: false, error: '' })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error'))
      }

      setStatus({
        loading: false,
        success: true,
        error: '',
      })

      // Reset form
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      })
    } catch (error) {
      setStatus({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : t('error'),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" required>
            {t('name')}
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder={t('namePlaceholder')}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email" required>
            {t('email')}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder={t('emailPlaceholder')}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="subject" required>
          {t('subject')}
        </Label>
        <Input
          id="subject"
          name="subject"
          type="text"
          required
          value={formData.subject}
          onChange={handleChange}
          placeholder={t('subjectPlaceholder')}
          className="w-full"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message" required>
          {t('message')}
        </Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          value={formData.message}
          onChange={handleChange}
          placeholder={t('messagePlaceholder')}
          className="w-full"
        />
      </div>

      <div className="flex justify-center pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={status.loading}
          loading={status.loading}
          loadingText={t('sending')}
          className="w-full md:w-auto py-3 text-lg  rounded-2xl bg-linear-to-r from-primary-900 to-secondary-800 text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary-800/20"
        >
          {t('submit')}
        </Button>
      </div>

      {status.error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-2xl text-sm">
          {status.error}
        </div>
      )}

      {status.success && (
        <div className="bg-primary-100 dark:bg-background/20 text-primary-800 dark:text-primary-300 p-3 rounded-2xl text-sm">
          {t('success')}
        </div>
      )}
    </form>
  )
}
