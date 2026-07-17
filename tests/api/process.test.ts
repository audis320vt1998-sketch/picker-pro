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
  it('rejects a request without files', async () => {
    const response = await POST(requestWithFiles([]))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'At least one PDF or image file is required.',
    })
  })

  it('rejects unsupported files', async () => {
    const response = await POST(
      requestWithFiles([{ name: 'order.txt', type: 'text/plain' }])
    )

    expect(response.status).toBe(415)
    await expect(response.json()).resolves.toEqual({
      error: 'Unsupported file type: text/plain',
    })
  })

  it('does not return an empty picking result while OCR is unavailable', async () => {
    const response = await POST(
      requestWithFiles([{ name: 'order.jpg', type: 'image/jpeg' }])
    )

    expect(response.status).toBe(501)
    await expect(response.json()).resolves.toEqual({
      error: 'Document processing is not available yet.',
      code: 'OCR_NOT_IMPLEMENTED',
    })
  })
})
