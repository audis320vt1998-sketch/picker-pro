import { NextRequest, NextResponse } from 'next/server'

/**
 * This legacy route is intentionally disabled. In particular, it must not
 * parse multipart input while it cannot produce traceable results: doing so
 * would needlessly receive filenames or document bytes outside the active
 * preflight workflow.
 */
export function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Document processing is not available yet.',
      code: 'OCR_NOT_IMPLEMENTED',
    },
    {
      status: 501,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
