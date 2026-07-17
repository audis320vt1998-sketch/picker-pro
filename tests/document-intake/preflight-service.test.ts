import {
  preflightMaayanOcrPage,
  type OcrPage,
  type OcrWord,
} from '../../lib/document-intake'
import { maayanCloseupRedactedOcrPage } from '../fixtures/maayan-closeup-redacted-ocr'

const width = 2880
const height = 3840

function word(text: string, x: number, y: number, confidence = 92): OcrWord {
  return {
    text,
    confidence,
    boundingBox: { x0: x, y0: y, x1: x + 32, y1: y + 32 },
  }
}

function traceablePage(): OcrPage {
  return {
    width,
    height,
    words: [
      word('customer-example', 1600, 260),
      word('0541112222', 2100, 300),
      word('1', 2700, 1000),
      word('92101', 2430, 1000),
      word('07290020531001', 2030, 1000),
      word('Turbo', 1700, 1000),
      word('Chocolate', 1500, 1000),
      word('2.00', 800, 1000),
      word('10.00', 620, 1000),
      word('20.00', 420, 1000),
      word('999.99', 100, 1000),
      word('1/10', 1600, 1050),
    ],
  }
}

describe('preflightMaayanOcrPage', () => {
  it('returns only a review-only table draft with source quantity fields', () => {
    const result = preflightMaayanOcrPage(traceablePage())
    const page = result.pages[0]
    const row = page.rows[0]

    expect(result).toMatchObject({
      kind: 'DOCUMENT_PREFLIGHT',
      status: 'NEEDS_REVIEW',
      profile: 'MAAYAN_PRICE_OFFER_V1',
    })
    expect(row).toMatchObject({
      source: {
        pageNumber: 1,
        printedRowNumber: 1,
        parserRowIndex: 1,
      },
      sku: '92101',
      barcode: '07290020531001',
      sourceQuantities: {
        caseQuantity: 2,
        unitsPerCase: 10,
        totalUnits: 20,
      },
    })
    expect(row.traceText).toContain('07290020531001')
    expect(row.traceText).not.toContain('999.99')
    expect(page.issues).toContainEqual(
      expect.objectContaining({ code: 'OCR_DRAFT_REQUIRES_REVIEW' })
    )
  })

  it('keeps header data and non-whitelisted price text out of the response', () => {
    const serialized = JSON.stringify(preflightMaayanOcrPage(traceablePage()))

    expect(serialized).not.toContain('customer-example')
    expect(serialized).not.toContain('0541112222')
    expect(serialized).not.toContain('999.99')
  })

  it('does not create rows for a low-resolution full-page photo', () => {
    const result = preflightMaayanOcrPage({
      width: 720,
      height: 1280,
      words: traceablePage().words,
    })

    expect(result.pages[0]).toMatchObject({ rows: [] })
    expect(result.pages[0]?.issues).toContainEqual(
      expect.objectContaining({ code: 'IMAGE_TOO_LOW_RESOLUTION' })
    )
  })

  it('does not invent a row when no SKU and product barcode share a table line', () => {
    const result = preflightMaayanOcrPage({
      width,
      height,
      words: [
        word('92101', 2430, 900),
        word('07290020531001', 2030, 1200),
      ],
    })

    expect(result.pages[0]).toMatchObject({ rows: [] })
    expect(result.pages[0]?.issues).toContainEqual(
      expect.objectContaining({ code: 'DOCUMENT_LAYOUT_UNRECOGNIZED' })
    )
  })

  it('does not treat a header-like identifier pair as a table row without its printed row number', () => {
    const result = preflightMaayanOcrPage({
      width,
      height,
      words: [
        word('92101', 2430, 700),
        word('07290020531001', 2030, 700),
        word('customer-example', 1600, 700),
      ],
    })

    expect(result.pages[0]).toMatchObject({ rows: [] })
    expect(result.pages[0]?.issues).toContainEqual(
      expect.objectContaining({ code: 'DOCUMENT_LAYOUT_UNRECOGNIZED' })
    )
  })

  it('keeps only traceable rows from redacted close-up geometry with wrapped names and numeric distractions', () => {
    const result = preflightMaayanOcrPage(maayanCloseupRedactedOcrPage)
    const page = result.pages[0]

    expect(page.rows).toHaveLength(3)
    expect(page.rows.map((row) => row.barcode)).toEqual([
      '7290020531991',
      '07290020539991',
      '8437020396158',
    ])
    expect(page.rows[1]?.sourceQuantities).toEqual({
      caseQuantity: 2,
      unitsPerCase: 10,
      totalUnits: 20,
    })
    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('0540000000')
    expect(serialized).not.toContain('4760000')
    expect(serialized).not.toContain('header-like')
    expect(serialized).not.toContain('12.23')
  })
})
