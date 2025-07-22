import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { InventoryOperations } from '@/lifo_ai_core/database/operations'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 items per page
  const category = searchParams.get('category')
  const status = searchParams.get('status') || 'active'

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID required' }, { status: 400 })
  }

  // Validate pagination
  if (page < 1 || limit < 1) {
    return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
  }

  try {
    const operations = new InventoryOperations(supabase)
    const hasAccess = await operations.validateStoreAccess(storeId, user.id)

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'No access to this store',
        },
        { status: 403 },
      )
    }

    // Get inventory data
    const { data, count } = await operations.getStoreInventory(storeId, {
      page,
      limit,
      category: category ?? undefined,
      status,
    })

    // Calculate additional metrics for each item
    const inventory = data.map(batch => {
      const daysToExpiry = Math.floor(
        (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )

      type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low'
      const urgencyLevel: UrgencyLevel =
        daysToExpiry <= 0
          ? 'critical'
          : daysToExpiry <= 1
            ? 'high'
            : daysToExpiry <= 3
              ? 'medium'
              : 'low'

      const totalValue = batch.current_quantity * batch.selling_price
      const marginPercent = ((batch.selling_price - batch.cost_price) / batch.selling_price) * 100

      return {
        ...batch,
        days_to_expiry: daysToExpiry,
        is_expired: daysToExpiry < 0,
        urgency_level: urgencyLevel,
        total_value: Math.round(totalValue * 100) / 100,
        margin_percent: Math.round(marginPercent * 100) / 100,
        // Include product scores if available
        composite_score: batch.product_scores?.[0]?.composite_score || null,
        recommendation: batch.product_scores?.[0]?.recommendation || null,
      }
    })

    // Sort by urgency and expiry date
    inventory.sort((a, b) => {
      // First by urgency level
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const urgencyDiff =
        urgencyOrder[a.urgency_level as keyof typeof urgencyOrder] -
        urgencyOrder[b.urgency_level as keyof typeof urgencyOrder]
      if (urgencyDiff !== 0) return urgencyDiff

      // Then by days to expiry
      return a.days_to_expiry - b.days_to_expiry
    })

    return NextResponse.json({
      inventory,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
        hasNext: page * limit < count,
        hasPrev: page > 1,
      },
      summary: {
        total_items: count,
        critical_items: inventory.filter(item => item.urgency_level === 'critical').length,
        expired_items: inventory.filter(item => item.is_expired).length,
        total_value: inventory.reduce((sum, item) => sum + item.total_value, 0),
      },
    })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch inventory',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST /api/inventory - Update inventory item
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
    const { batchId, action, value, storeId } = body

    if (!batchId || !action || !storeId) {
      return NextResponse.json(
        {
          error: 'Batch ID, action, and store ID are required',
        },
        { status: 400 },
      )
    }

    const operations = new InventoryOperations(supabase)
    const hasAccess = await operations.validateStoreAccess(storeId, user.id, 'staff')

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: 'No access to this store',
        },
        { status: 403 },
      )
    }

    switch (action) {
      case 'update_quantity':
        if (typeof value !== 'number' || value < 0) {
          return NextResponse.json(
            {
              error: 'Invalid quantity value',
            },
            { status: 400 },
          )
        }

        await operations.updateBatchQuantity(batchId, value, user.id)
        return NextResponse.json({
          success: true,
          message: 'Quantity updated successfully',
        })

      case 'apply_discount':
        if (typeof value !== 'number' || value < 0 || value > 90) {
          return NextResponse.json(
            {
              error: 'Discount percent must be between 0 and 90',
            },
            { status: 400 },
          )
        }

        await operations.applyDiscount(batchId, value, user.id)
        return NextResponse.json({
          success: true,
          message: `${value}% discount applied successfully`,
        })

      default:
        return NextResponse.json(
          {
            error: 'Invalid action. Supported actions: update_quantity, apply_discount',
          },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error('Error updating inventory:', error)
    return NextResponse.json(
      {
        error: 'Failed to update inventory',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
