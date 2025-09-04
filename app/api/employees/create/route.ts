// app/api/employees/create/route.ts
// FIXED SERVER-SIDE EMPLOYEE CREATION - Corrected Permission Logic

import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

interface CreateEmployeeRequest {
  firstName: string
  lastName: string
  email: string
  username: string
  role: 'employee' | 'manager'
  languagePreference: string
  storeId: string
  pin: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEmployeeRequest = await request.json()
    const { firstName, lastName, email, username, role, languagePreference, storeId, pin } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !username || !storeId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Validate PIN format
    if (!/^[0-9]{6}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN must be exactly 6 digits' },
        { status: 400 },
      )
    }

    // Create server client (for permission checks using user context)
    const supabase = await createClient()

    // Create admin client (for admin operations like creating users)
    const adminSupabase = createAdminClient() // ✅ FIXED: Use admin client

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    // ✅ FIXED: Check permission using the correct business.store_users table structure
    const { data: storeUser, error: permissionError } = await supabase
      .schema('business')
      .from('store_users')
      .select('role_in_store, permissions, is_active')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (permissionError) {
      console.error('❌ Permission query error:', permissionError)
      return NextResponse.json(
        { success: false, error: 'Failed to check store permissions' },
        { status: 500 },
      )
    }

    if (!storeUser) {
      console.error('❌ User not found in store')
      return NextResponse.json(
        { success: false, error: 'You are not a member of this store' },
        { status: 403 },
      )
    }

    // ✅ FIXED: Check if user has permission to create employees
    const canManageUsers =
      storeUser.role_in_store === 'owner' ||
      storeUser.role_in_store === 'manager' ||
      storeUser.permissions?.can_manage_users === true

    if (!canManageUsers) {
      return NextResponse.json(
        { success: false, error: 'Permission denied: You cannot create users in this store' },
        { status: 403 },
      )
    }

    // ✅ FIXED: Check for duplicate username using admin client
    const { data: isAvailable, error: availabilityError } = await adminSupabase.rpc(
      'check_username_availability',
      { p_username: username },
    )

    if (availabilityError) {
      console.error('❌ Username availability check error:', availabilityError)
      return NextResponse.json(
        { success: false, error: 'Failed to check username availability' },
        { status: 500 },
      )
    }

    if (!isAvailable) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 },
      )
    }

    // ✅ Create user using Admin API with proper service role permissions
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: email, // Use the actual email provided by the user
      password: pin, // PIN becomes password
      email_confirm: true,
      user_metadata: {
        username,
        full_name: `${firstName} ${lastName}`,
        role: 'employee',
        language_preference: languagePreference,
        created_by_admin: true,
        store_id: storeId, // Store the store context
      },
    })

    if (createError || !newUser.user) {
      console.error('❌ Admin API error:', createError)
      return NextResponse.json(
        {
          success: false,
          error: createError?.message || 'Failed to create user',
          details: createError,
        },
        { status: 500 },
      )
    }

    // ✅ Add user to store with appropriate permissions
    const employeePermissions = {
      can_scan_products: true,
      can_scan_in: true,
      can_scan_out: true,
      can_view_basic_inventory: true,
      can_apply_discounts: false,
      can_view_analytics: false,
      can_upload_inventory: false,
      can_manage_users: false,
      can_manage_settings: false,
    }

    // For managers, give additional permissions
    if (role === 'manager') {
      employeePermissions.can_apply_discounts = true
      employeePermissions.can_view_analytics = true
      employeePermissions.can_upload_inventory = true
      employeePermissions.can_manage_users = true
    }

    const { error: storeError } = await adminSupabase
      .schema('business')
      .from('store_users')
      .insert({
        store_id: storeId,
        user_id: newUser.user.id,
        role_in_store: role,
        assigned_by: user.id,
        is_active: true,
        can_use_pin_auth: true,
        pin_access_level: 'basic',
        permissions: employeePermissions,
        assigned_at: new Date().toISOString(),
      })

    if (storeError) {
      console.error('❌ Store assignment error:', storeError)

      // Try to clean up the created user
      try {
        await adminSupabase.auth.admin.deleteUser(newUser.user.id)
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup user after store assignment error:', cleanupError)
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to assign user to store',
          details: storeError,
        },
        { status: 500 },
      )
    }

    // Return success with credentials
    return NextResponse.json({
      success: true,
      user_id: newUser.user.id,
      username,
      email, // Return the actual user email
      pin,
      role,
      message: 'Employee created successfully using Admin API',
    })
  } catch (error: unknown) {
    console.error('❌ Server error in employee creation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
