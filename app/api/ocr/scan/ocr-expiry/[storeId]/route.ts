import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const { storeId } = await params
    const supabase = await createClient()

    // Get the session to authenticate with backend
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the FormData from the request
    const formData = await request.formData()

    // Forward request to FastAPI backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const response = await fetch(`${apiUrl}/api/v1/ocr/scan/ocr-expiry/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OCR API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to process OCR expiry scan', details: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('OCR ocr-expiry API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
