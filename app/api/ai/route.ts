import { NextResponse } from 'next/server'

export async function POST() {
  // AI suggestions must remain read-only, auditable, and attached to verified
  // source rows. That contract is not implemented yet, so this route is disabled.
  return NextResponse.json(
    {
      error: 'AI assistance is not available yet.',
      code: 'AI_ASSISTANCE_UNAVAILABLE',
    },
    { status: 501 }
  )
}
