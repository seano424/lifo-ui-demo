// app/api/onboarding/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { convertFormDataToStoreInsert } from '@/lib/schemas/store-schemas'
import type { StoreFormData } from '@/lib/stores/onboarding-store'

// Test modes
const DEV_MODE = true
const REAL_USER_TEST = true

interface OnboardingRequest {
  userId: string
  store: StoreFormData
  user: {
    email: string
    fullName?: string
  }
}

// Create a service role client that bypasses RLS
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(request: NextRequest) {
  console.log('=== ONBOARDING API CALLED ===')

  try {
    const body: OnboardingRequest = await request.json()
    const { userId, store, user } = body

    console.log('📥 Received request:', {
      userId,
      storeName: store?.store_name,
      userEmail: user?.email,
      storeType: store?.store_type,
    })

    // Validate required fields
    if (!userId || !store || !user) {
      console.error('❌ Missing required fields:', {
        userId: !!userId,
        store: !!store,
        user: !!user,
      })
      return NextResponse.json(
        { error: 'Missing required fields: userId, store, or user' },
        { status: 400 },
      )
    }

    if (!store.store_name || !user.email) {
      console.error('❌ Missing store or user required fields')
      return NextResponse.json(
        { error: 'Missing required store fields: store_name or user email' },
        { status: 400 },
      )
    }

    console.log('✅ Validation passed')

    if (DEV_MODE && !REAL_USER_TEST) {
      // Pure dev mode - no database changes
      console.log('🔄 Using DEV_MODE (no database changes)')
      return handleDevModeOnboarding(userId, store, user)
    } else if (DEV_MODE && REAL_USER_TEST) {
      // Real user test mode - create actual stores for your account
      console.log('🔄 Using REAL_USER_TEST mode - creating actual database records')
      return await handleRealUserTestMode(userId, store, user)
    } else {
      // Full production mode
      console.log('🔄 Using PRODUCTION mode')
      return await handleProductionOnboarding(userId, store, user)
    }
  } catch (error) {
    console.error('=== ONBOARDING API ERROR ===')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Updated function for testing with your real account
async function handleRealUserTestMode(
  userId: string,
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  console.log('🧪 === REAL USER TEST MODE ===')
  console.log('🔑 Using dynamic user ID from frontend:', userId)

  // Use service role client to bypass RLS (proper approach)
  const supabase = createServiceRoleClient()
  console.log('🔐 Created service role client (bypasses RLS)')

  const storeCode = `${store.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

  try {
    // Create store with the user ID from frontend
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

    console.log('📝 Creating store with data:', {
      store_name: storeInsert.store_name,
      store_code: storeInsert.store_code,
      store_type: storeInsert.store_type,
      owner_id: storeInsert.owner_id,
    })

    // Create store record with service role (bypasses RLS)
    const { data: storeData, error: storeError } = await supabase
      .schema('business')
      .from('stores')
      .insert(storeInsert)
      .select('store_id')
      .single()

    if (storeError) {
      console.error('❌ Store creation error:', storeError)
      console.error('❌ Full error details:', JSON.stringify(storeError, null, 2))
      throw new Error(`Failed to create store: ${storeError.message}`)
    }

    console.log('✅ Store created successfully:', storeData.store_id)

    // Create store-user relationship
    const storeUserData = {
      store_id: storeData.store_id,
      user_id: userId,
      role_in_store: 'owner',
      permissions: {
        can_view_analytics: true,
        can_apply_discounts: true,
        can_upload_inventory: true,
        can_manage_users: true,
        can_manage_settings: true,
      },
      assigned_by: userId,
    }

    console.log('📝 Creating store-user relationship:', storeUserData)

    const { error: storeUserError } = await supabase
      .schema('business')
      .from('store_users')
      .insert(storeUserData)

    if (storeUserError) {
      console.error('❌ Store-user relationship error:', storeUserError)
      console.error('❌ Full error details:', JSON.stringify(storeUserError, null, 2))
      throw new Error(`Failed to create store-user relationship: ${storeUserError.message}`)
    }

    console.log('✅ Store-user relationship created')

    // Create default store settings
    console.log('📝 Creating store settings for store:', storeData.store_id)

    const { error: settingsError } = await supabase
      .schema('business')
      .from('store_settings')
      .insert({
        store_id: storeData.store_id,
      })

    if (settingsError) {
      console.warn('⚠️ Store settings creation failed:', settingsError)
      console.warn('⚠️ Full error details:', JSON.stringify(settingsError, null, 2))
      // Don't fail the whole process for settings
    } else {
      console.log('✅ Store settings created')
    }

    const successResponse = {
      success: true,
      message: 'Real User Test: Store created successfully for your account!',
      data: {
        storeId: storeData.store_id,
        userId: userId,
        storeCode,
        testMode: true,
        realUser: true,
      },
    }

    console.log('🎉 Success response:', successResponse)
    return NextResponse.json(successResponse)
  } catch (error) {
    console.error('💥 Real user test error:', error)
    throw error
  }
}

// Keep existing dev mode function
function handleDevModeOnboarding(
  userId: string,
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  console.log('🧪 === DEV MODE ACTIVE - NO DATABASE CHANGES ===')

  const mockStoreCode = `${store.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

  console.log('📋 DEV MODE: Would create store:', {
    store_name: store.store_name,
    store_code: mockStoreCode,
    store_type: store.store_type,
    owner_id: userId,
  })

  const response = {
    success: true,
    message: 'DEV MODE: Onboarding completed successfully (no database changes)',
    data: {
      storeId: 'mock-store-id-123',
      userId: userId,
      storeCode: mockStoreCode,
      testMode: true,
    },
  }

  console.log('🎉 DEV MODE response:', response)
  return NextResponse.json(response)
}

// Production mode handler
async function handleProductionOnboarding(
  userId: string,
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  console.log('🔐 === PRODUCTION MODE ===')

  // Use service role client for production too (for onboarding)
  const supabase = createServiceRoleClient()
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

    // Create store record
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

    // Create store-user relationship
    const { error: storeUserError } = await supabase
      .schema('business')
      .from('store_users')
      .insert({
        store_id: storeData.store_id,
        user_id: userId,
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

    // Create default store settings
    const { error: settingsError } = await supabase
      .schema('business')
      .from('store_settings')
      .insert({
        store_id: storeData.store_id,
      })

    if (settingsError) {
      console.error('Store settings creation error:', settingsError)
      console.warn('Store settings creation failed but continuing...')
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        storeId: storeData.store_id,
        userId: userId,
        storeCode,
        testMode: false,
      },
    })
  } catch (error) {
    console.error('Production onboarding error:', error)
    throw error
  }
}
