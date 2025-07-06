import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lifo-ai-core/database/operations'

// GET /api/stores - List user's stores
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const operations = new InventoryOperations(supabase)
    const stores = await operations.getUserStores(user.id)

    return NextResponse.json({ stores })
  } catch (error) {
    console.error('Error fetching stores:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch stores',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// POST /api/stores - Create new store
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      store_name,
      store_code,
      store_type,
      address,
      city,
      country,
      business_name,
      size_category,
    } = body

    // Validate required fields
    if (!store_name || !store_code) {
      return NextResponse.json(
        {
          error: 'Store name and code are required',
        },
        { status: 400 },
      )
    }

    // Validate store_type
    const validStoreTypes = [
      'supermarket',
      'convenience',
      'restaurant',
      'bakery',
      'butcher',
      'organic',
    ]
    if (store_type && !validStoreTypes.includes(store_type)) {
      return NextResponse.json(
        {
          error: `Invalid store type. Must be one of: ${validStoreTypes.join(', ')}`,
        },
        { status: 400 },
      )
    }

    // Validate size_category
    const validSizes = ['small', 'medium', 'large', 'hypermarket']
    if (size_category && !validSizes.includes(size_category)) {
      return NextResponse.json(
        {
          error: `Invalid size category. Must be one of: ${validSizes.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const operations = new InventoryOperations(supabase)
    const store = await operations.createStore(
      {
        store_name,
        store_code: store_code.toUpperCase(),
        store_type,
        address,
        city,
        country: country || 'France',
        business_name,
        size_category,
      },
      user.id,
    )

    return NextResponse.json(
      {
        store,
        message: 'Store created successfully',
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating store:', error)

    // Handle specific database errors
    if (error instanceof Error && error.message.includes('23505')) {
      // Unique violation
      return NextResponse.json(
        {
          error: 'Store code already exists. Please choose a different code.',
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create store',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
