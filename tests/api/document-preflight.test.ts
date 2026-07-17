import { NextRequest } from 'next/server'
import type { OcrPage, OcrWord } from '../../lib/document-intake'

jest.mock('../../lib/document-intake/tesseract-adapter', () => ({
  recognizeTesseractImage: jest.fn(),
}))

import { POST } from '../../app/api/intake/preflight/route'
import { recognizeTesseractImage } from '../../lib/document-intake/tesseract-adapter'

const recognizeMock = recognizeTesseractImage as jest.MockedFunction<
  typeof recognizeTesseractImage
>

function jpeg(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
  ])
}

function word(text: string, x: number, y: number, confidence = 92): OcrWord {
  return {
    text,
    confidence,
    boundingBox: { x0: x, y0: y, x1: x + 32, y1: y + 32 },
  }
}

function recognizedPage(): OcrPage {
  return {
    width: 2880,
    height: 3840,
    words: [
      word('private-customer', 1600, 220),
      word('1', 2700, 1000),
      word('92101', 2430, 1000),
      word('07290020531001', 2030, 1000),
      word('Turbo', 1600, 1000),
      word('2', 800, 1000),
      word('10', 620, 1000),
      word('20', 420, 1000),
    ],
  }
}

function requestWithFiles(
  files: Array<{ name: string; type: string; content: Uint8Array }>
): NextRequest {
  const form = new FormData()
  for (const file of files) {
    form.append('file', new Blob([file.content], { type: file.type }), file.name)
  }

  return new NextRequest('http://localhost/api/intake/preflight', {
    method: 'POST',
    body: form,
  })
}

beforeEach(() => {
  recognizeMock.mockReset()
})

describe('POST /api/intake/preflight', () => {
  it('returns a no-store, review-only draft without header PII or file names', async () => {
    recognizeMock.mockResolvedValue(recognizedPage())

    const response = await POST(
      requestWithFiles([
        {
          name: 'customer-private-order.jpg',
          type: 'image/jpeg',
          content: jpeg(2880, 3840),
        },
      ])
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const body = await response.json()
    expect(body).toMatchObject({
      kind: 'DOCUMENT_PREFLIGHT',
      status: 'NEEDS_REVIEW',
      profile: 'MAAYAN_PRICE_OFFER_V1',
      pages: [
        {
          pageNumber: 1,
          rows: [
            {
              sku: '92101',
              barcode: '07290020531001',
              sourceQuantities: {
                caseQuantity: 2,
                unitsPerCase: 10,
                totalUnits: 20,
              },
            },
          ],
        },
      ],
    })
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('private-customer')
    expect(serialized).not.toContain('customer-private-order.jpg')
    expect(serialized).not.toContain('acceptedRowCount')
    expect(serialized).not.toContain('totals')
  })

  it('rejects missing, multiple, and unsupported uploads', async () => {
    const missing = await POST(requestWithFiles([]))
    expect(missing.status).toBe(400)

    const multiple = await POST(
      requestWithFiles([
        { name: 'one.jpg', type: 'image/jpeg', content: jpeg(2880, 3840) },
        { name: 'two.jpg', type: 'image/jpeg', content: jpeg(2880, 3840) },
      ])
    )
    expect(multiple.status).toBe(400)

    const unsupported = await POST(
      requestWithFiles([
        { name: 'order.pdf', type: 'application/pdf', content: jpeg(2880, 3840) },
      ])
    )
    expect(unsupported.status).toBe(415)
  })

  it('returns a resolution issue without invoking OCR for low-resolution photos', async () => {
    const response = await POST(
      requestWithFiles([
        {
          name: 'full-page.jpg',
          type: 'image/jpeg',
          content: jpeg(720, 1280),
        },
      ])
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      kind: 'DOCUMENT_PREFLIGHT',
      status: 'NEEDS_REVIEW',
      pages: [
        {
          rows: [],
          issues: [expect.objectContaining({ code: 'IMAGE_TOO_LOW_RESOLUTION' })],
        },
      ],
    })
    expect(recognizeMock).not.toHaveBeenCalled()
  })

  it('rejects oversized image dimensions before invoking OCR', async () => {
    const response = await POST(
      requestWithFiles([
        {
          name: 'too-large.jpg',
          type: 'image/jpeg',
          content: jpeg(6000, 5000),
        },
      ])
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({
      error: 'The image dimensions are too large for OCR preflight.',
      code: 'IMAGE_DIMENSIONS_TOO_LARGE',
    })
    expect(recognizeMock).not.toHaveBeenCalled()
  })

  it('returns a busy response instead of starting a second OCR worker', async () => {
    let resolveFirst: ((page: OcrPage) => void) | undefined
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    recognizeMock.mockImplementationOnce(
      () =>
        new Promise<OcrPage>((resolve) => {
          resolveFirst = resolve
          markStarted?.()
        })
    )

    const first = POST(
      requestWithFiles([
        { name: 'first.jpg', type: 'image/jpeg', content: jpeg(2880, 3840) },
      ])
    )
    await started

    const second = await POST(
      requestWithFiles([
        { name: 'second.jpg', type: 'image/jpeg', content: jpeg(2880, 3840) },
      ])
    )

    expect(second.status).toBe(429)
    await expect(second.json()).resolves.toEqual({
      error: 'OCR preflight is busy with another image. Try again shortly.',
      code: 'OCR_PREFLIGHT_BUSY',
    })

    resolveFirst?.(recognizedPage())
    expect((await first).status).toBe(200)
  })

  it('returns a truthful error when the OCR engine fails', async () => {
    recognizeMock.mockRejectedValue(new Error('engine unavailable'))

    const response = await POST(
      requestWithFiles([
        { name: 'close-up.jpg', type: 'image/jpeg', content: jpeg(2880, 3840) },
      ])
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error:
        'OCR preflight is temporarily unavailable. Enter the rows manually and try again later.',
      code: 'OCR_PREFLIGHT_UNAVAILABLE',
    })
  })

  it('returns an invalid-image response when the OCR decoder rejects image content', async () => {
    const decodeError = new Error('Error attempting to read image.')
    decodeError.name = 'OcrImageDecodeError'
    recognizeMock.mockRejectedValue(decodeError)

    const response = await POST(
      requestWithFiles([
        { name: 'corrupt.jpg', type: 'image/jpeg', content: jpeg(2880, 3840) },
      ])
    )

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: 'The uploaded file could not be decoded as an image.',
      code: 'INVALID_IMAGE_CONTENT',
    })
  })
})
