import { NextRequest } from 'next/server'
import { POST } from '../../app/api/process/route'

function requestWithFiles(files: Array<{ name: string; type: string }>) {
  const form = new FormData()

  for (const file of files) {
    form.append('files', new Blob(['document'], { type: file.type }), file.name)
  }

  return new NextRequest('http://localhost/api/process', {
    method: 'POST',
    body: form,
  })
}

describe('POST /api/process', () => {
  async function expectUnavailable(request: NextRequest) {
    const response = await POST(request)

    expect(response.status).toBe(501)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      error: 'Document processing is not available yet.',
      code: 'OCR_NOT_IMPLEMENTED',
    })
  }

  it('does not return an empty picking result while OCR is unavailable', async () => {
    await expectUnavailable(
      requestWithFiles([{ name: 'order.jpg', type: 'image/jpeg' }])
    )
  })

  it('does not parse or echo a hostile legacy upload request', async () => {
    const sourceFileName = 'customer-alice-order.jpg'
    await expectUnavailable(
      requestWithFiles([{ name: sourceFileName, type: '' }])
    )
  })

  it('keeps the disabled response stable for malformed multipart input', async () => {
    await expectUnavailable(
      new NextRequest('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data; boundary=missing' },
        body: 'not-a-multipart-body',
      })
    )
  })
})
