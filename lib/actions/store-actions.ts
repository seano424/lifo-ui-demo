'use server'

import { cookies } from 'next/headers'

const ACTIVE_STORE_COOKIE_KEY = 'activeStoreId'

export async function setActiveStoreCookie(storeId: string) {
  const cookieStore = await cookies()

  cookieStore.set(ACTIVE_STORE_COOKIE_KEY, storeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return { success: true }
}

export async function getActiveStoreCookie(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_STORE_COOKIE_KEY)?.value || null
}
