import {
  parseMaayanTable,
  type MaayanTableLayout,
  type OcrWord,
} from '../../lib/document-intake'

const layout: MaayanTableLayout = {
  bodyBounds: { x0: 0, y0: 100, x1: 1000, y1: 900 },
  lineMergeDistance: 12,
  continuationDistance: 32,
  columns: {
    printedRowNumber: { xMin: 900, xMax: 1000 },
    sku: { xMin: 800, xMax: 899 },
    barcode: { xMin: 650, xMax: 799 },
    productName: { xMin: 350, xMax: 649 },
    trayBarcode: { xMin: 300, xMax: 349 },
    caseQuantity: { xMin: 220, xMax: 299 },
    unitsPerCase: { xMin: 140, xMax: 219 },
    totalUnits: { xMin: 60, xMax: 139 },
  },
}

function word(text: string, x: number, y: number, confidence = 90): OcrWord {
  return {
    text,
    confidence,
    boundingBox: { x0: x, y0: y, x1: x + 30, y1: y + 12 },
  }
}

describe('parseMaayanTable', () => {
  it('preserves explicit source quantity columns and a leading barcode zero', () => {
    const rows = parseMaayanTable(
      [
        word('1', 950, 200),
        word('92101', 840, 200),
        word('07290020531001', 690, 200),
        word('טורבו', 620, 200),
        word('גלידת', 560, 200),
        word('חלבון', 500, 200),
        word('שוקולד', 430, 200),
        word('2.00', 250, 200),
        word('10.00', 170, 200),
        word('20.00', 90, 200),
      ],
      layout
    )

    expect(rows).toEqual([
      expect.objectContaining({
        printedRowNumber: 1,
        sku: '92101',
        barcode: '07290020531001',
        productName: 'טורבו גלידת חלבון שוקולד',
        rawQuantities: {
          caseQuantity: 2,
          unitsPerCase: 10,
          totalUnits: 20,
        },
        fieldConfidences: {
          printedRowNumber: 90,
          sku: 90,
          barcode: 90,
          productName: 90,
          caseQuantity: 90,
          unitsPerCase: 90,
          totalUnits: 90,
        },
        issues: [],
      }),
    ])
  })

  it('retains confidence for each accepted field and flags only a low-confidence field', () => {
    const rows = parseMaayanTable(
      [
        word('1', 950, 200, 92),
        word('92101', 840, 200, 58),
        word('07290020531001', 690, 200, 88),
        word('טורבו', 620, 200, 78),
        word('2.00', 250, 200, 85),
        word('10.00', 170, 200, 86),
        word('20.00', 90, 200, 87),
      ],
      layout
    )

    expect(rows[0]?.fieldConfidences).toEqual({
      printedRowNumber: 92,
      sku: 58,
      barcode: 88,
      productName: 78,
      caseQuantity: 85,
      unitsPerCase: 86,
      totalUnits: 87,
    })
    expect(rows[0]?.issues).toContainEqual(
      expect.objectContaining({ code: 'LOW_FIELD_CONFIDENCE', field: 'sku' })
    )
    expect(rows[0]?.issues).not.toContainEqual(
      expect.objectContaining({ code: 'LOW_FIELD_CONFIDENCE', field: 'barcode' })
    )
  })

  it('adds a wrapped product-name line to its anchored row without changing quantities', () => {
    const rows = parseMaayanTable(
      [
        word('1', 950, 200),
        word('92100', 840, 200),
        word('7290020531025', 690, 200),
        word('טורבו', 620, 200),
        word('גלידת', 560, 200),
        word('חלבון', 500, 200),
        word('1.00', 250, 200),
        word('10.00', 170, 200),
        word('10.00', 90, 200),
        word('וניל', 620, 224),
        word('1/10', 550, 224),
      ],
      layout
    )

    expect(rows).toEqual([
      expect.objectContaining({
        productName: 'טורבו גלידת חלבון וניל 1/10',
        rawQuantities: {
          caseQuantity: 1,
          unitsPerCase: 10,
          totalUnits: 10,
        },
      }),
    ])
  })

  it('does not merge multiple numeric OCR tokens into an invented quantity', () => {
    const rows = parseMaayanTable(
      [
        word('1', 950, 200),
        word('88135', 840, 200),
        word('8000380213498', 690, 200),
        word('לואקר', 620, 200),
        word('3', 250, 200),
        word('1', 260, 200),
        word('1.00', 170, 200),
        word('3.00', 90, 200),
      ],
      layout
    )

    expect(rows[0]).toEqual(
      expect.objectContaining({
        rawQuantities: {
          caseQuantity: null,
          unitsPerCase: 1,
          totalUnits: 3,
        },
      })
    )
    expect(rows[0]?.issues).toContainEqual(
      expect.objectContaining({
        code: 'AMBIGUOUS_NUMERIC_FIELD',
        field: 'caseQuantity',
      })
    )
  })

  it('ignores words outside the table body, including document header data', () => {
    const rows = parseMaayanTable(
      [
        word('4763517', 700, 40),
        word('1', 950, 200),
        word('88135', 840, 200),
        word('8000380213498', 690, 200),
        word('לואקר', 620, 200),
        word('3.00', 250, 200),
        word('1.00', 170, 200),
        word('3.00', 90, 200),
      ],
      layout
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.rawText).not.toContain('4763517')
  })

  it('does not emit a nearby identifier pair without a printed table row number', () => {
    const rows = parseMaayanTable(
      [
        word('1', 950, 200),
        word('92101', 840, 200),
        word('07290020531001', 690, 200),
        word('×˜×•×¨×‘×•', 620, 200),
        word('1.00', 250, 200),
        word('10.00', 170, 200),
        word('10.00', 90, 200),
        word('99999', 840, 224),
        word('1234567890123', 690, 224),
        word('header-like', 620, 224),
      ],
      layout
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.rawText).not.toContain('header-like')
  })
})
