/**
 * AI assistance is intentionally disabled until Picker Pro has a read-only,
 * traceable suggestion contract. In particular, AI must not write results or
 * silently alter OCR-derived quantities.
 */

export interface ChatGPTResponse {
  reply: string
  toolCallsMade: string[]
}

export class AiAssistanceUnavailableError extends Error {
  constructor() {
    super('AI assistance is not available yet.')
    this.name = 'AiAssistanceUnavailableError'
  }
}

export async function chat(
  _userMessage: string,
  _conversationHistory: readonly unknown[] = []
): Promise<never> {
  throw new AiAssistanceUnavailableError()
}
