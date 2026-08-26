import { NextRequest } from 'next/server'
import type { OcrPage } from '../../lib/document-intake'

jest.mock('../../lib/document-intake/pdf-renderer', () => ({
  renderPdfToPngPages: jest.fn(),
  PdfRenderingError: class PdfRenderingError extends Error {
    constructor(readonly code: string) {
      super(code)
    }
  },
}))

jest.mock('../../lib/document-intake/tesseract-adapter', () => ({
  recognizeTesseractImage: jest.fn(),
}))

import { POST } from '../../app/api/intake/pdf-preflight/route'
import { renderPdfToPngPages } from '../../lib/document-intake/pdf-renderer'
import { recognizeTesseractImage } from '../../lib/document-intake/tesseract-adapter'

const renderMock = renderPdfToPngPages as jest.MockedFunction<
  typeof renderPdfToPngPages
>
const recognizeMock = recognizeTesseractImage as jest.MockedFunction<
  typeof recognizeTesseractImage
>

function png(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    width >>> 24, (width >>> 16) & 0xff, (width >>> 8) & 0xff, width & 0xff,
    height >>> 24, (height >>> 16) & 0xff, (height >>> 8) & 0xff, height & 0xff,
  ])
}

function requestWithPdf(type = 'application/pdf', content = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 55])) {
  const form = new FormData()
  form.append('file', new Blob([content], { type }), 'customer-private-order.pdf')
  return new NextRequest('http://localhost/api/intake/pdf-preflight', {
    method: 'POST',
    body: form,
  })
}

function recognizedPage(): OcrPage {
  return { width: 1800, height: 2400, words: [] }
}

beforeEach(() => {
  renderMock.mockReset()
  recognizeMock.mockReset()
})

describe('POST /api/intake/pdf-preflight', () => {
  it('returns non-persistent review drafts for every rendered PDF page', async () => {
    renderMock.mockResolvedValue([png(1800, 2400), png(1800, 2400)])
    recognizeMock.mockResolvedValue(recognizedPage())

    const response = await POST(requestWithPdf())

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      kind: 'DOCUMENT_PREFLIGHT',
      status: 'NEEDS_REVIEW',
      pages: [{ pageNumber: 1 }, { pageNumber: 2 }],
    })
    expect(renderMock).toHaveBeenCalledTimes(1)
    expect(recognizeMock).toHaveBeenCalledTimes(2)
  })

  it('rejects a non-PDF type and never invokes the renderer', async () => {
    const response = await POST(requestWithPdf('image/jpeg'))

    expect(response.status).toBe(415)
    await expect(response.json()).resolves.toMatchObject({
      code: 'UNSUPPORTED_PDF_TYPE',
    })
    expect(renderMock).not.toHaveBeenCalled()
  })

  it('rejects a PDF declaration whose content lacks the PDF signature', async () => {
    const response = await POST(requestWithPdf('application/pdf', png(1800, 2400)))

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({ code: 'INVALID_PDF' })
    expect(renderMock).not.toHaveBeenCalled()
  })
})
