/**
 * ChatGPT service with read and write tool access
 * Allows the model to read existing results and write new ones via function calling
 */

import OpenAI from 'openai'
import { createDatabase } from '../database'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/** Tool definitions exposed to ChatGPT */
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_result',
      description: 'Read a single processing result by its ID',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The result ID to retrieve',
          },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_results',
      description: 'List recent processing results',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (default 10)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_result',
      description: 'Save a new processing result to the database',
      parameters: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            description: 'The result data to save',
          },
        },
        required: ['data'],
      },
    },
  },
]

/** Execute a tool call requested by ChatGPT */
async function executeTool(name: string, args: Record<string, unknown>): Promise<string> {
  const db = createDatabase(process.env.DATABASE_URL ?? '')

  if (name === 'read_result') {
    const result = await db.getResult(args.id as string)
    return JSON.stringify(result ?? { error: 'Not found' })
  }

  if (name === 'list_results') {
    const limit = typeof args.limit === 'number' ? args.limit : 10
    const results = await db.listResults(limit)
    return JSON.stringify(results)
  }

  if (name === 'write_result') {
    const id = await db.saveResult(args.data)
    return JSON.stringify({ id })
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` })
}

export interface ChatGPTResponse {
  reply: string
  toolCallsMade: string[]
}

/**
 * Send a message to ChatGPT and resolve any read/write tool calls it makes
 *
 * @param userMessage - The user's message/instruction
 * @param conversationHistory - Optional prior messages for context
 * @returns Final text reply and list of tool calls executed
 */
export async function chat(
  userMessage: string,
  conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = []
): Promise<ChatGPTResponse> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'You are a helpful assistant for the Picker Pro application. ' +
        'You have access to tools that let you read and write processing results in the database. ' +
        'Use these tools whenever the user asks about stored data or wants to save information.',
    },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ]

  const toolCallsMade: string[] = []

  // Agentic loop: keep running until the model stops requesting tool calls
  while (true) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools,
      tool_choice: 'auto',
    })

    const choice = response.choices[0]
    const assistantMessage = choice.message

    messages.push(assistantMessage)

    if (choice.finish_reason !== 'tool_calls' || !assistantMessage.tool_calls?.length) {
      return {
        reply: assistantMessage.content ?? '',
        toolCallsMade,
      }
    }

    // Execute each requested tool call and feed results back
    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
      const result = await executeTool(toolCall.function.name, args)
      toolCallsMade.push(toolCall.function.name)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
      })
    }
  }
}
