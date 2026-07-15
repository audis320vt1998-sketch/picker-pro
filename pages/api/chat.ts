import type { NextApiRequest, NextApiResponse } from 'next'
import { chat } from '../../lib/ai/openai'
import type { ChatMessage } from '../../lib/ai/openai'

interface ChatRequest {
  messages: ChatMessage[]
  model?: string
}

interface ChatApiResponse {
  success: boolean
  text?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const { messages, model } = req.body as ChatRequest

  if (!Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: 'messages array is required' })
  }

  try {
    const result = await chat(messages, { model })
    return res.status(200).json({ success: true, text: result.text })
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
