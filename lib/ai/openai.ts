/**
 * OpenAI API client
 * Thin fetch-based wrapper — keeps the API key server-side only.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ChatResponse {
  text: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * Send a list of messages to the OpenAI Chat Completions API.
 *
 * @param messages - Conversation history (system, user, assistant turns)
 * @param options  - Optional model / sampling parameters
 * @returns The assistant's reply text plus usage metadata
 * @throws Error when the API key is missing or the request fails
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Add it to your .env.local file.'
    )
  }

  const {
    model = 'gpt-4o-mini',
    temperature = 0.2,
    maxTokens = 512,
  } = options

  const authHeader = 'Bearer ' + apiKey

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `OpenAI API error ${response.status}: ${errorBody}`
    )
  }

  const data = await response.json()
  const choice = data.choices?.[0]

  if (!choice) {
    throw new Error('OpenAI returned no choices')
  }

  return {
    text: choice.message.content as string,
    model: data.model as string,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  }
}

/**
 * Convenience wrapper: send a single user prompt with an optional system prompt.
 */
export async function prompt(
  userMessage: string,
  systemMessage?: string,
  options?: ChatOptions
): Promise<string> {
  const messages: ChatMessage[] = []

  if (systemMessage) {
    messages.push({ role: 'system', content: systemMessage })
  }

  messages.push({ role: 'user', content: userMessage })

  const result = await chat(messages, options)
  return result.text
}
