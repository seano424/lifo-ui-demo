// lib/auth/pin-auth.ts - PIN authentication utilities

import bcrypt from 'bcryptjs'
import { createClient } from '@/lib/supabase/client'

export interface PINLoginResult {
  success: boolean
  user?: {
    id: string
    email: string
    username: string
    full_name: string
    store_id?: string
  }
  error?: string
  isLocked?: boolean
  attemptsRemaining?: number
}

export interface PINValidationData {
  username: string
  pin: string
}

// PIN configuration constants
export const PIN_CONFIG = {
  length: 6,
  maxAttempts: 3,
  lockoutDurationMinutes: 15,
  expiryDays: 90,
  historyCount: 5, // Can't reuse last 5 PINs
} as const

// Blocked PIN patterns (weak PINs)
export const BLOCKED_PINS = [
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
] as const

/**
 * Generate a secure 6-digit PIN
 */
export function generateSecurePIN(): string {
  let pin: string
  let attempts = 0
  const maxAttempts = 100

  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString()
    attempts++

    if (attempts > maxAttempts) {
      throw new Error('Unable to generate secure PIN after maximum attempts')
    }
  } while (BLOCKED_PINS.includes(pin as (typeof BLOCKED_PINS)[number]) || isSequentialPIN(pin))

  return pin
}

/**
 * Check if PIN contains sequential numbers
 */
function isSequentialPIN(pin: string): boolean {
  if (pin.length !== 6) return false

  const digits = pin.split('').map(Number)

  // Check ascending sequence (1234, 2345, etc.)
  let isAscending = true
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] + 1) {
      isAscending = false
      break
    }
  }

  // Check descending sequence (4321, 5432, etc.)
  let isDescending = true
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i - 1] - 1) {
      isDescending = false
      break
    }
  }

  return isAscending || isDescending
}

/**
 * Hash a PIN for storage
 */
export async function hashPIN(pin: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(pin, saltRounds)
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * Validate PIN login and create Supabase session
 */
export async function validatePINLogin(data: PINValidationData): Promise<PINLoginResult> {
  const supabase = createClient()

  try {

    // Call Supabase RPC function to validate PIN and get user data
    const { data: result, error } = await supabase.rpc('validate_pin_login', {
      p_username: data.username,
      p_pin: data.pin,
    })

    if (error) {
      console.error('[validatePINLogin] RPC error:', error)
      return {
        success: false,
        error: 'Authentication service error',
      }
    }

    if (!result || !result.success) {
      // Handle specific error cases
      if (result?.is_locked) {
        return {
          success: false,
          error: result.error || `Account locked for ${PIN_CONFIG.lockoutDurationMinutes} minutes`,
          isLocked: true,
        }
      }

      if (result?.attempts_remaining !== undefined) {
        return {
          success: false,
          error: `Invalid PIN. ${result.attempts_remaining} attempts remaining.`,
          attemptsRemaining: result.attempts_remaining,
        }
      }

      return {
        success: false,
        error: result.error || 'Invalid username or PIN',
      }
    }

    // Success! For PIN login, we need to create a session using the sign-in method
    // Since the user has been validated server-side, we can use a magic link approach

    // Sign in the user using their email (since PIN validation succeeded)
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: result.user.email,
      options: {
        shouldCreateUser: false, // User already exists
        data: {
          login_method: 'pin',
          username: result.user.username,
          store_id: result.user.store_id,
        },
      },
    })

    if (authError) {
      console.error('[validatePINLogin] Auth error:', authError)
      // Fallback: try to refresh the session if user is already logged in
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData.session) {
        return {
          success: false,
          error: 'Failed to create session. Please try again.',
        }
      }
    }


    return {
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        full_name: result.user.full_name,
        store_id: result.user.store_id,
      },
    }
  } catch (error) {
    console.error('[validatePINLogin] Unexpected error:', error)
    return {
      success: false,
      error: 'Login failed. Please try again.',
    }
  }
}

/**
 * Reset PIN attempts for a user (admin function)
 */
export async function resetUserPINAttempts(userId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.rpc('reset_pin_attempts', {
      target_user_id: userId,
    })

    if (error) {
      console.error('[resetUserPINAttempts] Error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[resetUserPINAttempts] Unexpected error:', error)
    return false
  }
}

/**
 * Update user's PIN (with verification)
 */
export async function updateUserPIN(
  userId: string,
  oldPin: string,
  newPin: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  try {
    // Validate new PIN strength
    if (BLOCKED_PINS.includes(newPin as (typeof BLOCKED_PINS)[number]) || isSequentialPIN(newPin)) {
      return {
        success: false,
        error: 'PIN is too weak. Please choose a different PIN.',
      }
    }

    const { error } = await supabase.rpc('update_user_pin', {
      target_user_id: userId,
      old_pin: oldPin,
      new_pin: newPin,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[updateUserPIN] Unexpected error:', error)
    return {
      success: false,
      error: 'Failed to update PIN',
    }
  }
}

/**
 * Generate username from name (for employee creation)
 */
export function generateUsername(firstName: string, lastName: string, storeCode?: string): string {
  // Clean and format names
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '')

  // Take first 4 chars of first name + first char of last name
  const baseUsername = (cleanFirst.substring(0, 4) + cleanLast.substring(0, 1)).toLowerCase()

  // Add store code if provided
  if (storeCode) {
    return `${baseUsername}.${storeCode}`
  }

  return baseUsername
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  // Username should be 3-20 characters, alphanumeric plus dots and dashes
  const usernameRegex = /^[a-zA-Z0-9.-]{3,20}$/
  return usernameRegex.test(username)
}

/**
 * Check if user is currently PIN locked
 */
export async function isUserPINLocked(userId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('check_pin_lock_status', {
      target_user_id: userId,
    })

    if (error) {
      console.error('[isUserPINLocked] Error:', error)
      return false
    }

    return data?.is_locked || false
  } catch (error) {
    console.error('[isUserPINLocked] Unexpected error:', error)
    return false
  }
}
