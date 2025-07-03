// app/api/onboarding/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { convertFormDataToStoreInsert } from '@/lib/schemas/store-schemas'
import type { StoreFormData } from '@/lib/stores/onboarding-store'

// Test modes
const DEV_MODE = true
const REAL_USER_TEST = true // New flag for testing with your real account
const YOUR_USER_ID = 'your-actual-user-id-here' // Replace with your actual user ID

interface OnboardingRequest {
  userId: string
  store: StoreFormData
  user: {
    email: string
    fullName?: string
  }
}

export async function POST(request: NextRequest) {
  console.log('=== ONBOARDING API CALLED ===')

  try {
    const body: OnboardingRequest = await request.json()
    const { userId, store, user } = body

    // Validate required fields
    if (!userId || !store || !user) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, store, or user' },
        { status: 400 },
      )
    }

    console.log('Onboarding request received:', {
      userId,
      storeName: store.store_name,
      userEmail: user.email,
    })

    if (DEV_MODE && !REAL_USER_TEST) {
      // Pure dev mode - no database changes
      return handleDevModeOnboarding(userId, store, user)
    } else if (DEV_MODE && REAL_USER_TEST) {
      // Real user test mode - create actual stores for your account
      console.log('🧪 REAL USER TEST MODE: Creating store for existing user')
      return await handleRealUserTestMode(store, user)
    } else {
      // Full production mode
      return await handleProductionOnboarding(userId, store, user)
    }
  } catch (error) {
    console.error('=== ONBOARDING API ERROR ===', error)
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}

// New function for testing with your real account
async function handleRealUserTestMode(
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  const supabase = await createServerClient()
  const storeCode = `${store.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

  try {
    console.log('🔑 Using real user ID:', YOUR_USER_ID)

    // Create store with your real user ID
    const storeInsert = convertFormDataToStoreInsert(
      {
        ...store,
        store_type: store.store_type as
          | 'supermarket'
          | 'convenience'
          | 'restaurant'
          | 'bakery'
          | 'butcher'
          | 'organic'
          | 'other',
      },
      storeCode,
      YOUR_USER_ID,
    )

    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .insert(storeInsert)
      .select('store_id')
      .single()

    if (storeError) {
      console.error('Store creation error:', storeError)
      throw new Error(`Failed to create store: ${storeError.message}`)
    }

    console.log('✅ Store created successfully:', storeData.store_id)

    // Create store-user relationship with your real account
    const { error: storeUserError } = await supabase.from('store_users').insert({
      store_id: storeData.store_id,
      user_id: YOUR_USER_ID, // Your real Supabase user ID
      role_in_store: 'owner',
      permissions: {
        can_view_analytics: true,
        can_apply_discounts: true,
        can_upload_inventory: true,
        can_manage_users: true,
        can_manage_settings: true,
      },
      assigned_by: YOUR_USER_ID,
    })

    if (storeUserError) {
      console.error('Store-user relationship error:', storeUserError)
      throw new Error(`Failed to create store-user relationship: ${storeUserError.message}`)
    }

    console.log('✅ Store-user relationship created')

    // Create default store settings
    const { error: settingsError } = await supabase.from('store_settings').insert({
      store_id: storeData.store_id,
    })

    if (settingsError) {
      console.warn('Store settings creation failed:', settingsError)
    }

    return NextResponse.json({
      success: true,
      message: 'Real User Test: Store created successfully for your account!',
      data: {
        storeId: storeData.store_id,
        userId: YOUR_USER_ID,
        storeCode,
        testMode: true,
        realUser: true,
      },
    })
  } catch (error) {
    console.error('Real user test error:', error)
    throw error
  }
}

// Keep existing dev mode function
function handleDevModeOnboarding(
  userId: string,
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  console.log('=== DEV MODE ACTIVE - NO DATABASE CHANGES ===')

  const mockStoreCode = `${store.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

  console.log('DEV MODE: Would create store:', {
    store_name: store.store_name,
    store_code: mockStoreCode,
    // ... rest of store data
  })

  return NextResponse.json({
    success: true,
    message: 'DEV MODE: Onboarding completed successfully (no database changes)',
    data: {
      storeId: 'mock-store-id-123',
      userId: userId,
      storeCode: mockStoreCode,
      testMode: true,
    },
  })
}

// Production mode handler
async function handleProductionOnboarding(
  userId: string,
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  console.log('=== PRODUCTION MODE ===')

  const supabase = await createServerClient()

  // Generate store code
  const storeCode = `${store.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

  try {
    // Convert form data to database insert format
    const storeInsert = convertFormDataToStoreInsert(
      {
        ...store,
        store_type: store.store_type as
          | 'supermarket'
          | 'convenience'
          | 'restaurant'
          | 'bakery'
          | 'butcher'
          | 'organic',
      },
      storeCode,
      userId,
    )

    // 1. Create store record in business.stores
    const { data: storeData, error: storeError } = await supabase
      .schema('business')
      .from('stores')
      .insert(storeInsert)
      .select('store_id')
      .single()

    if (storeError) {
      console.error('Store creation error:', storeError)
      throw new Error(`Failed to create store: ${storeError.message}`)
    }

    console.log('Store created successfully:', storeData.store_id)

    // 2. Create user record in user_mgmt.users
    const { data: userData, error: userError } = await supabase
      .schema('user_mgmt')
      .from('users')
      .insert({
        username: user.email.split('@')[0],
        email: user.email,
        password_hash: 'managed_by_supabase_auth', // Placeholder since Supabase Auth handles this
        full_name: user.fullName || '',
        is_active: true,
      })
      .select('user_id')
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      // Clean up store if user creation fails
      await supabase.from('stores').delete().eq('store_id', storeData.store_id)
      throw new Error(`Failed to create user: ${userError.message}`)
    }

    console.log('User created successfully:', userData.user_id)

    // 3. Get admin role ID
    const { data: adminRole, error: roleError } = await supabase
      .schema('user_mgmt')
      .from('roles')
      .select('role_id')
      .eq('role_name', 'admin')
      .single()

    if (roleError || !adminRole) {
      console.error('Admin role lookup error:', roleError)
      throw new Error('Failed to find admin role')
    }

    // 4. Assign admin role to user
    const { error: roleAssignError } = await supabase
      .schema('user_mgmt')
      .from('user_roles')
      .insert({
        user_id: userData.user_id,
        role_id: adminRole.role_id,
        assigned_by: userData.user_id, // Self-assigned during onboarding
      })

    if (roleAssignError) {
      console.error('Role assignment error:', roleAssignError)
      throw new Error(`Failed to assign admin role: ${roleAssignError.message}`)
    }

    console.log('Admin role assigned successfully')

    // 5. Create store-user relationship
    const { error: storeUserError } = await supabase
      .schema('business')
      .from('store_users')
      .insert({
        store_id: storeData.store_id,
        user_id: userId, // Link to Supabase Auth user
        role_in_store: 'owner',
        permissions: {
          can_view_analytics: true,
          can_apply_discounts: true,
          can_upload_inventory: true,
          can_manage_users: true,
          can_manage_settings: true,
        },
        assigned_by: userId,
      })

    if (storeUserError) {
      console.error('Store-user relationship error:', storeUserError)
      throw new Error(`Failed to create store-user relationship: ${storeUserError.message}`)
    }

    console.log('Store-user relationship created successfully')

    // 6. Create default store settings
    const { error: settingsError } = await supabase
      .schema('business')
      .from('store_settings')
      .insert({
        store_id: storeData.store_id,
        // Default values will be used from schema
      })

    if (settingsError) {
      console.error('Store settings creation error:', settingsError)
      // Non-critical error - don't fail the whole process
      console.warn('Store settings creation failed but continuing...')
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        storeId: storeData.store_id,
        userId: userData.user_id,
        storeCode,
        testMode: false,
      },
    })
  } catch (error) {
    console.error('Production onboarding error:', error)
    throw error
  }
}
