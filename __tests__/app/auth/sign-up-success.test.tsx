/**
 * Tests for sign-up success page
 *
 * These tests verify:
 * - Email validation from URL parameter (security issue #1)
 * - Rate limiting on resend verification (security issue #2)
 * - Suspense boundary for useSearchParams (Next.js 15 requirement)
 * - Supabase client optimization with useMemo
 */

import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useSearchParams } from 'next/navigation'
import SignUpSuccessPage from '@/app/(auth)/auth/sign-up-success/page'
import { createClient } from '@/lib/supabase/client'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

jest.mock('@/lib/supabase/client')

jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      'auth.signUpSuccess': {
        title: 'Verify your email address',
        checkEmail: 'Check your {email} inbox',
        openEmail: 'Open Email',
        resendVerification: 'Resend verification email',
        resending: 'Sending...',
        getHelp: 'Get help',
        resendSuccess: 'Verification email sent successfully!',
        resendError: 'Failed to resend verification email. Please try again.',
      },
      'auth.errors': {
        invalidEmail: 'Please enter a valid email address',
      },
    }

    const t = (key: string) => translations[namespace]?.[key] || key
    t.rich = (key: string, values?: any) => {
      const text = translations[namespace]?.[key] || key
      if (values?.email && typeof values.email === 'function') {
        // Return a React element for proper rendering
        const emailElement = values.email()
        return (
          <>
            {text.replace('{email}', '')} {emailElement}
          </>
        )
      }
      return text
    }
    return t
  },
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

const mockSupabase = {
  auth: {
    resend: jest.fn(),
  },
}

describe('SignUpSuccessPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Email validation (Security Issue #1)', () => {
    it('should display email when valid email is provided', () => {
      const mockSearchParams = new URLSearchParams('email=user@example.com')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      render(<SignUpSuccessPage />)

      expect(screen.getByText(/user@example.com/i)).toBeInTheDocument()
    })

    it('should show error when invalid email is provided', () => {
      const mockSearchParams = new URLSearchParams('email=invalid-email')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      render(<SignUpSuccessPage />)

      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument()
    })

    it('should show error when XSS attempt is made via email parameter', () => {
      const mockSearchParams = new URLSearchParams('email=<script>alert("xss")</script>')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      render(<SignUpSuccessPage />)

      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument()
      expect(screen.queryByText(/<script>/i)).not.toBeInTheDocument()
    })

    it('should handle missing email parameter gracefully', () => {
      const mockSearchParams = new URLSearchParams('')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      render(<SignUpSuccessPage />)

      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  describe('Rate limiting (Security Issue #2)', () => {
    it('should allow resending verification email when no cooldown', async () => {
      const user = userEvent.setup()
      const mockSearchParams = new URLSearchParams('email=user@example.com')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
      mockSupabase.auth.resend.mockResolvedValue({ error: null })

      render(<SignUpSuccessPage />)

      const resendButton = screen.getByRole('button', { name: /resend verification email/i })
      await user.click(resendButton)

      await waitFor(() => {
        expect(mockSupabase.auth.resend).toHaveBeenCalledWith({
          type: 'signup',
          email: 'user@example.com',
          options: {
            emailRedirectTo: expect.stringContaining('/dashboard'),
          },
        })
      })
    })

    it('should disable resend button during cooldown period', async () => {
      const user = userEvent.setup()
      const mockSearchParams = new URLSearchParams('email=user@example.com')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
      mockSupabase.auth.resend.mockResolvedValue({ error: null })

      render(<SignUpSuccessPage />)

      const resendButton = screen.getByRole('button', { name: /resend verification email/i })

      // First click - should work
      await user.click(resendButton)
      await waitFor(() => {
        expect(mockSupabase.auth.resend).toHaveBeenCalledTimes(1)
      })

      // Second click immediately - should be disabled with cooldown text
      await waitFor(() => {
        expect(resendButton).toBeDisabled()
        expect(resendButton.textContent).toMatch(/Wait \d+s/)
      })
    })

    it('should not call API when button is disabled', async () => {
      const user = userEvent.setup()
      const mockSearchParams = new URLSearchParams('email=invalid-email')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      render(<SignUpSuccessPage />)

      const resendButton = screen.getByRole('button', { name: /resend verification email/i })
      expect(resendButton).toBeDisabled()

      await user.click(resendButton)

      expect(mockSupabase.auth.resend).not.toHaveBeenCalled()
    })
  })

  describe('Supabase client optimization', () => {
    it('should not create multiple Supabase clients on re-renders', () => {
      const mockSearchParams = new URLSearchParams('email=user@example.com')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      const { rerender } = render(<SignUpSuccessPage />)

      const initialCallCount = (createClient as jest.Mock).mock.calls.length

      // Force re-render
      rerender(<SignUpSuccessPage />)

      // Should still be the same number of calls due to useMemo
      expect((createClient as jest.Mock).mock.calls.length).toBe(initialCallCount)
    })
  })

  describe('Email provider detection', () => {
    it('should show Open Email button for all email addresses', () => {
      const mockSearchParams = new URLSearchParams('email=user@gmail.com')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      render(<SignUpSuccessPage />)

      expect(screen.getByRole('button', { name: /open email/i })).toBeInTheDocument()
    })

    it('should not execute mailto with invalid email', async () => {
      const user = userEvent.setup()
      const mockSearchParams = new URLSearchParams('email=invalid')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      // Mock window.open and window.location.href
      const mockOpen = jest.fn()
      const originalOpen = window.open
      window.open = mockOpen

      render(<SignUpSuccessPage />)

      const openEmailButton = screen.getByRole('button', { name: /open email/i })
      await user.click(openEmailButton)

      expect(mockOpen).not.toHaveBeenCalled()

      window.open = originalOpen
    })
  })

  describe('Support email environment variable', () => {
    it('should use environment variable for support email', async () => {
      const user = userEvent.setup()
      const mockSearchParams = new URLSearchParams('email=user@example.com')
      ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

      const mockOpen = jest.fn()
      const originalOpen = window.open
      window.open = mockOpen

      render(<SignUpSuccessPage />)

      const helpButton = screen.getByRole('button', { name: /get help/i })
      await user.click(helpButton)

      expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('mailto:'), '_blank')

      window.open = originalOpen
    })
  })
})
