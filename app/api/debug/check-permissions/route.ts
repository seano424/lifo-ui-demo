// app/api/debug/check-permissions/route.ts
// DEBUGGING TOOL - Check user permissions for a specific store

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get('storeId') || '8e380e2d-81bb-40c4-9da3-ce75c0df5e78'

    const supabase = await createClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        authError,
      })
    }

    // Check store user permissions
    const { data: storeUser, error: permissionError } = await supabase
      .schema('business')
      .from('store_users')
      .select('*')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .single()

    // Also get store info
    const { data: store, error: storeError } = await supabase
      .schema('business')
      .from('stores')
      .select('store_name, owner_id')
      .eq('store_id', storeId)
      .single()

    const permissions = storeUser?.permissions as { can_manage_users?: boolean } | null
    const canManageUsers =
      storeUser?.role_in_store === 'owner' ||
      storeUser?.role_in_store === 'manager' ||
      (permissions?.can_manage_users ?? false)

    return NextResponse.json({
      success: true,
      debug: {
        user: {
          id: user.id,
          email: user.email,
          metadata: user.user_metadata,
        },
        store: {
          id: storeId,
          name: store?.store_name,
          owner_id: store?.owner_id,
          error: storeError?.message,
        },
        storeUser: {
          found: !!storeUser,
          data: storeUser,
          error: permissionError?.message,
        },
        permissions: {
          canManageUsers,
          isOwner: storeUser?.role_in_store === 'owner',
          isManager: storeUser?.role_in_store === 'manager',
          hasManageUsersPermission: permissions?.can_manage_users ?? false,
          isActive: storeUser?.is_active,
        },
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack,
    })
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Use GET method' }, { status: 405 })
}
