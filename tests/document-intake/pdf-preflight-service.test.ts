import { OcrImageDecodeError } from '../../lib/document-intake/tesseract-adapter'
import { preflightPdfRasterPages } from '../../lib/document-intake/pdf-preflight-service'

function png(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    137,
    80,
    78,
    71,
    13,
    10,
    26,
    10,
    0,
    0,
    0,
    13,
    73,
    72,
    68,
    82,
    width >>> 24,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    height >>> 24,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
  ])
}

describe('PDF OCR preflight service', () => {
  it('keeps rendered PDF pages separate and reassigns their traceable page numbers', async () => {
    const recognize = jest.fn().mockResolvedValue({
      width: 1800,
      height: 2400,
      words: [],
    })

    const result = await preflightPdfRasterPages(
      [png(1800, 2400), png(1800, 2400)],
      recognize
    )

    expect(recognize).toHaveBeenCalledTimes(2)
    expect(result.pages.map((page) => page.pageNumber)).toEqual([1, 2])
    expect(result.pages.every((page) => page.issues[0]?.code === 'DOCUMENT_LAYOUT_UNRECOGNIZED')).toBe(true)
  })

  it('does not send a low-resolution rendered page to OCR', async () => {
    const recognize = jest.fn()

    const result = await preflightPdfRasterPages([png(1100, 1500)], recognize)

    expect(recognize).not.toHaveBeenCalled()
    expect(result.pages[0]).toMatchObject({
      pageNumber: 1,
      issues: [{ code: 'IMAGE_TOO_LOW_RESOLUTION' }],
    })
  })

  it('turns a page-level image decode failure into a review issue', async () => {
    const recognize = jest.fn().mockRejectedValue(new OcrImageDecodeError())

    const result = await preflightPdfRasterPages([png(1800, 2400)], recognize)

    expect(result.pages[0]).toMatchObject({
      pageNumber: 1,
      rows: [],
      issues: [{ code: 'PDF_PAGE_UNREADABLE' }],
    })
  })
})
