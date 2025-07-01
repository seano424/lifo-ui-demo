import { NextRequest, NextResponse } from 'next/server'

const DEV_MODE = true

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
