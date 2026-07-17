import { POST } from '../../app/api/ai/route'

describe('POST /api/ai', () => {
  it('keeps AI assistance unavailable until it has an audited read-only contract', async () => {
    const response = await POST()

    expect(response.status).toBe(501)
    await expect(response.json()).resolves.toEqual({
      error: 'AI assistance is not available yet.',
      code: 'AI_ASSISTANCE_UNAVAILABLE',
    })
  })
})
