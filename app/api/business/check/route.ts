// app/api/business/check/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { businessCheckSchema } from '@/lib/schemas/store-schemas'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const validationResult = businessCheckSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 },
      )
    }

    const { name, address, city, postalCode, country } = validationResult.data

    // Create service role client that bypasses RLS (inside the request handler)
    const supabaseServiceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Use service role client to bypass RLS for business checking
    const { data: existingStores, error } = await supabaseServiceRole
      .schema('business')
      .from('stores')
      .select('*')
      .ilike('store_name', `%${name.trim()}%`)
      .ilike('city', city.trim())
      .ilike('postal_code', postalCode.trim())
      .ilike('country', country.trim())

    if (error) {
      console.error('Database error during business check:', error)
      return NextResponse.json({ error: 'Failed to check business records' }, { status: 500 })
    }

    // If we find any stores, check for exact matches
    if (existingStores && existingStores.length > 0) {
      for (const store of existingStores) {
        // More precise matching - normalize addresses for comparison
        const normalizeAddress = (addr: string | null) =>
          (addr || '')
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim()

        const storeNameMatch = store.store_name.toLowerCase().trim() === name.toLowerCase().trim()
        const addressMatch = normalizeAddress(store.address) === normalizeAddress(address)

        // If we have a very close match, consider it a duplicate
        if (storeNameMatch && addressMatch) {
          return NextResponse.json({
            exists: true,
            storeData: {
              id: store.store_id,
              name: store.store_name,
              address: store.address,
              city: store.city,
              postalCode: store.postal_code,
              country: store.country,
            },
            message: 'This business already exists in our system.',
          })
        }
      }
    }

    // No exact match found
    return NextResponse.json({
      exists: false,
      message: 'Business not found - you can proceed with registration.',
    })
  } catch (error) {
    console.error('Error checking business:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
