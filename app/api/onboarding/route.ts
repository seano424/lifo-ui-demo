import { NextRequest, NextResponse } from 'next/server'
import type { StoreDetails } from '@/lib/stores/onboarding-store'

const DEV_MODE = true

// Define a minimal user type for onboarding
interface OnboardingUser {
  email: string
  fullName?: string
}

export async function POST(request: NextRequest) {
  console.log('=== ONBOARDING API CALLED ===')

  try {
    const body = await request.json()
    console.log('Request body received:', body)

    const { userId, store, user } = body

    if (!userId || !store || !user) {
      console.error('Missing required fields:', { userId, store: !!store, user: !!user })
      return NextResponse.json(
        { error: 'Missing required fields: userId, store, or user' },
        { status: 400 },
      )
    }

    console.log('Onboarding request received:', {
      userId,
      store: store.name,
      userEmail: user.email,
    })

    if (DEV_MODE) {
      console.log('=== DEV MODE ACTIVE ===')

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Log the data we would save
      console.log('DEV MODE: Would create store:', {
        name: store.name,
        address: store.address,
        city: store.city,
        postal_code: store.postalCode,
        country: store.country,
        phone: store.phone,
        store_type: store.type,
        coordinates: store.coordinates,
        googlePlaceId: store.googlePlaceId,
      })

      console.log('DEV MODE: Would create user record:', {
        user_id: userId,
        username: user.email.split('@')[0],
        email: user.email,
        full_name: user.fullName || '',
        is_active: true,
      })

      console.log('DEV MODE: Would assign admin role to user')

      // Return mock success response
      const response = {
        success: true,
        message: 'DEV MODE: Onboarding completed successfully',
        data: {
          store: {
            store_id: 'mock-store-id-123',
            name: store.name,
            type: store.type,
          },
          user: {
            user_id: userId,
            email: user.email,
            role: 'admin',
          },
        },
      }

      console.log('DEV MODE: Returning response:', response)
      return NextResponse.json(response)
    }

    // Production mode
    console.log('=== PRODUCTION MODE ===')
    // TODO: Implement production onboarding logic here
    return NextResponse.json({ error: 'Production onboarding not implemented' }, { status: 501 })
  } catch (error) {
    console.error('=== ONBOARDING API ERROR ===')
    console.error('Error details:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// ========== PRODUCTION IMPLEMENTATION ==========
async function handleProductionOnboarding(
  userId: string,
  store: StoreDetails,
  user: OnboardingUser,
) {
  // Import here to avoid issues if not yet installed
  const { createClient } = await import('@/lib/supabase/server')

  try {
    const supabase = await createClient()

    // 1. Create store record
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .insert({
        name: store.name,
        address: store.address,
        city: store.city,
        postal_code: store.postalCode,
        country: store.country || 'France',
        phone: store.phone || null,
        store_type: store.type,
        // Handle coordinates if present
        coordinates:
          store.coordinates &&
          typeof store.coordinates.lng === 'number' &&
          typeof store.coordinates.lat === 'number'
            ? `POINT(${store.coordinates.lng} ${store.coordinates.lat})`
            : null,
        google_place_id: store.googlePlaceId || null,
        is_active: true,
      })
      .select()
      .single()

    if (storeError) {
      console.error('Store creation error:', storeError)
      throw new Error(`Failed to create store: ${storeError.message}`)
    }

    console.log('Store created successfully:', storeData.store_id)

    // 2. Create user record in user_mgmt.users
    const { data: userData, error: userError } = await supabase
      .from('user_mgmt.users')
      .insert({
        user_id: userId, // Link to Supabase Auth
        username: typeof user.email === 'string' ? user.email.split('@')[0] : '', // Generate username from email
        email: typeof user.email === 'string' ? user.email : '',
        password_hash: 'managed_by_supabase_auth', // Placeholder since Supabase Auth handles this
        full_name: user.fullName || '',
        store_id: storeData.store_id, // Link to the store we just created
        is_active: true,
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)
      // If user creation fails, we should probably delete the store to maintain consistency
      await supabase.from('stores').delete().eq('store_id', storeData.store_id)
      throw new Error(`Failed to create user: ${userError.message}`)
    }

    console.log('User created successfully:', userData.user_id)

    // 3. Get admin role ID
    const { data: adminRole, error: roleError } = await supabase
      .from('user_mgmt.roles')
      .select('role_id')
      .eq('role_name', 'admin')
      .single()

    if (roleError || !adminRole) {
      console.error('Admin role lookup error:', roleError)
      throw new Error('Failed to find admin role')
    }

    // 4. Assign admin role to user
    const { error: roleAssignError } = await supabase.from('user_mgmt.user_roles').insert({
      user_id: userId,
      role_id: adminRole.role_id,
      assigned_by: userId,
    })

    if (roleAssignError) {
      console.error('Role assignment error:', roleAssignError)
      throw new Error(`Failed to assign admin role: ${roleAssignError.message}`)
    }

    console.log('Admin role assigned successfully')

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: {
        store: {
          store_id: storeData.store_id,
          name: storeData.name,
          type: storeData.store_type,
        },
        user: {
          user_id: userData.user_id,
          email: userData.email,
          role: 'admin',
        },
      },
    })
  } catch (error) {
    console.error('Production onboarding error:', error)
    throw error
  }
}
