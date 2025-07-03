// app/api/onboarding/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { convertFormDataToStoreInsert } from '@/lib/schemas/store-schemas'
import type { StoreFormData } from '@/lib/stores/onboarding-store'

// Single environment variable approach
const ONBOARDING_MODE = process.env.ONBOARDING_MODE || 'production'

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
  console.log('🌍 ONBOARDING_MODE:', ONBOARDING_MODE)

  try {
    const body: OnboardingRequest = await request.json()
    const { userId, store, user } = body

    console.log('📥 Received request:', {
      userId,
      storeName: store?.store_name,
      userEmail: user?.email,
      storeType: store?.store_type,
    })

    // Validate required fields (always required)
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

    // Simple switch based on mode
    switch (ONBOARDING_MODE) {
      case 'mock':
        console.log('🎭 MOCK MODE: No database changes')
        return handleMockOnboarding(userId, store, user)

      case 'test':
        console.log('🧪 TEST MODE: Real database with current user')
        return await handleTestOnboarding(userId, store, user)

      case 'production':
      default:
        console.log('🔐 PRODUCTION MODE: Full signup flow')
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

// Mock mode - no dependencies, just returns fake success
function handleMockOnboarding(
  userId: string,
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  console.log('🎭 === MOCK MODE - NO DATABASE CHANGES ===')

  const mockStoreCode = `${store.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

  console.log('📋 MOCK: Would create store:', {
    store_name: store.store_name,
    store_code: mockStoreCode,
    store_type: store.store_type,
    owner_id: userId,
  })

  const response = {
    success: true,
    message: 'MOCK: Onboarding simulated successfully (no database changes)',
    data: {
      storeId: 'mock-store-id-123',
      userId: userId,
      storeCode: mockStoreCode,
      mode: 'mock',
    },
  }

  console.log('🎭 MOCK response:', response)
  return NextResponse.json(response)
}

// Test mode - requires logged in user, creates real database records
async function handleTestOnboarding(
  userId: string,
  store: StoreFormData,
  user: { email: string; fullName?: string },
) {
  console.log('🧪 === TEST MODE - REAL DATABASE ===')
  console.log('🔑 Using user ID from frontend:', userId)

  // Use service role client to bypass RLS
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

    // Create store record
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
      message: 'TEST: Store created successfully with your account!',
      data: {
        storeId: storeData.store_id,
        userId: userId,
        storeCode,
        mode: 'test',
      },
    }

    console.log('🎉 TEST success response:', successResponse)
    return NextResponse.json(successResponse)
  } catch (error) {
    console.error('💥 Test mode error:', error)
    throw error
  }
}

// Production mode - creates new auth user + store
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
      message: 'PRODUCTION: Onboarding completed successfully',
      data: {
        storeId: storeData.store_id,
        userId: userId,
        storeCode,
        mode: 'production',
      },
    })
  } catch (error) {
    console.error('Production onboarding error:', error)
    throw error
  }
}
