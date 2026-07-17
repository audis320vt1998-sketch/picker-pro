import { GET } from '../../app/api/health/route'

describe('GET /api/health', () => {
  it('reports unavailable capabilities instead of a false ready status', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      status: 'degraded',
      version: '0.1.0',
      capabilities: {
        documentProcessing: 'unavailable',
        aiAssistance: 'unavailable',
      },
    })
  })
})
