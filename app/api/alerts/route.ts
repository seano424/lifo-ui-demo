// TODO: Re-enable alerts API when ready
// This file is temporarily disabled to prevent build errors

export async function GET() {
  return new Response(JSON.stringify({ message: 'Alerts API temporarily disabled' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST() {
  return new Response(JSON.stringify({ message: 'Alerts API temporarily disabled' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  })
}
