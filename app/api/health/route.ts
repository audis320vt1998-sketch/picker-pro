import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      status: 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      capabilities: {
        documentProcessing: 'unavailable',
        aiAssistance: 'unavailable',
      },
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
