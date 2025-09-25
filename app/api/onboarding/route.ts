// app/api/onboarding/route.ts

import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { convertFormDataToStoreInsert } from '@/lib/schemas/store-schemas'
import type { StoreFormData } from '@/lib/stores/onboarding-store'

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
  try {
    const body: OnboardingRequest = await request.json()
    const { userId, store, user } = body

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

    // Unified onboarding flow - no more modes!
    return await handleOnboarding(userId, store)
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

// Unified onboarding handler - works for all cases
async function handleOnboarding(userId: string, store: StoreFormData) {
  const supabase = createServiceRoleClient()
  const storeCode = `${store.store_name.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}`

  try {
    // Verify that the user exists in auth.users
    // This handles both cases: existing logged-in users and newly created auth users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)

    if (userError || !userData?.user) {
      console.error('❌ User not found in auth.users:', userError)
      throw new Error(
        `User ${userId} not found in database. Please ensure the user exists before creating the store.`,
      )
    }

    console.log('✅ User verified in auth.users:', userData.user.email)

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

    const { error: storeUserError } = await supabase
      .schema('business')
      .from('store_users')
      .insert(storeUserData)

    if (storeUserError) {
      console.error('❌ Store-user relationship error:', storeUserError)
      console.error('❌ Full error details:', JSON.stringify(storeUserError, null, 2))
      throw new Error(`Failed to create store-user relationship: ${storeUserError.message}`)
    }

    console.log('✅ Store-user relationship created successfully')

    // Create default store settings
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
      console.log('✅ Store settings created successfully')
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully!',
      data: {
        storeId: storeData.store_id,
        userId: userId,
        storeCode,
      },
    })
  } catch (error) {
    console.error('💥 Onboarding error:', error)
    throw error
  }
}
