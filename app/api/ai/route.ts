import { NextRequest, NextResponse } from 'next/server'
import { chat } from '../../../lib/ai/chatgpt'
import type OpenAI from 'openai'

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 500 }
    )
  }

  const body = await req.json() as {
    message: string
    history?: OpenAI.Chat.ChatCompletionMessageParam[]
  }

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json(
      { error: 'A "message" string is required' },
      { status: 400 }
    )
  }

  const result = await chat(body.message, body.history ?? [])

  return NextResponse.json(result)
}
