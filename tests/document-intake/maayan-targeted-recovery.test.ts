import type { OcrPage, OcrWord } from '../../lib/document-intake'
import {
  groupTargetedProductNameWords,
  hasEnoughTargetedRows,
  recoverTargetedMaayanRows,
  selectTargetedQuantityCenters,
  selectTargetedSkuCalibration,
  targetedBarcodeRectangle,
  targetedProductNameRectangle,
  targetedQuantityRectangle,
  targetedSkuScanRectangle,
} from '../../lib/document-intake/maayan-targeted-recovery'

const page: Pick<OcrPage, 'width' | 'height'> = { width: 1000, height: 2000 }
const rowYs = [500, 650, 800, 950]

function word(text: string, x: number, y: number, confidence = 90): OcrWord {
  return {
    text,
    confidence,
    boundingBox: { x0: x, y0: y, x1: x + 20, y1: y + 20 },
  }
}

function skuWords(): OcrWord[] {
  return rowYs.flatMap((y, index) => [
    word(`92${100 + index}`, 850, y),
    // A plausible-looking numeric column outside the allowed calibration shift.
    word(`88${100 + index}`, 700, y),
  ])
}

describe('Maayan targeted numeric recovery', () => {
  it('calibrates only a repeated SKU column near the expected table position', () => {
    const calibration = selectTargetedSkuCalibration(page, skuWords())

    expect(calibration).toMatchObject({
      anchors: expect.arrayContaining([expect.objectContaining({ text: '92100' })]),
    })
    expect(calibration?.anchors).toHaveLength(4)
    expect(calibration?.skuCenterX).toBeGreaterThan(800)
    expect(targetedSkuScanRectangle(page)).toEqual({
      left: 700,
      top: 360,
      width: 260,
      height: 1140,
    })
    expect(targetedBarcodeRectangle(page, calibration!, calibration!.anchors[0])).toEqual(
      expect.objectContaining({ width: 180 })
    )
  })

  it('keeps the three repeated source-quantity columns separate from a price-like column', () => {
    const calibration = selectTargetedSkuCalibration(page, skuWords())!
    const scout = rowYs.flatMap((y) => [
      word('99.99', 45, y),
      word('20.00', 115, y),
      word('10.00', 205, y),
      word('2.00', 275, y),
    ])

    const centers = selectTargetedQuantityCenters(page, calibration, scout)

    expect(centers).toEqual({
      totalUnits: 125,
      unitsPerCase: 215,
      caseQuantity: 285,
    })
    expect(targetedQuantityRectangle(page, calibration, centers!, 'totalUnits')).toEqual(
      expect.objectContaining({ left: 80, width: 90 })
    )
  })

  it('scans only the calibrated product-name column and assigns each word to one SKU row', () => {
    const calibration = selectTargetedSkuCalibration(page, skuWords())!
    const grouped = groupTargetedProductNameWords(calibration, [
      word('טורבו', 540, rowYs[0], 81),
      word('וניל', 450, rowYs[0], 82),
      // A cropped edge can touch a barcode column; it is never name text.
      word('07290020531001', 650, rowYs[0], 91),
      word('גלידת', 540, rowYs[1], 90),
      word('שוקולד', 440, rowYs[1], 92),
      // Exactly between the first two rows: do not choose a SKU row for it.
      word('לא-משויך', 500, 575, 88),
    ])

    expect(targetedProductNameRectangle(page, calibration)).toEqual({
      left: 390,
      top: 420,
      width: 280,
      height: 630,
    })
    expect(grouped.map((row) => row.map((candidate) => candidate.text))).toEqual([
      ['טורבו', 'וניל'],
      ['גלידת', 'שוקולד'],
      [],
      [],
    ])
  })

  it('recovers only rows with one barcode and all three explicit source quantities', () => {
    const calibration = selectTargetedSkuCalibration(page, skuWords())!
    const quantityWords = {
      caseQuantity: rowYs.map((y) => word('2.00', 275, y)),
      unitsPerCase: rowYs.map((y) => word('10.00', 205, y)),
      totalUnits: rowYs.map((y) => word('20.00', 115, y)),
    }
    const rows = recoverTargetedMaayanRows(calibration, {
      barcodeWordsByAnchor: [
        [word('07290020531001', 700, rowYs[0])],
        [word('07290020531002', 700, rowYs[1])],
        // Competing valid tokens must be rejected instead of joined or guessed.
        [
          word('07290020531003', 700, rowYs[2]),
          word('07290020531004', 710, rowYs[2]),
        ],
        [word('07290020531005', 700, rowYs[3])],
      ],
      printedRowWords: [word('1', 950, rowYs[0]), word('2', 950, rowYs[1])],
      quantityWords,
    })

    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      printedRowNumber: 1,
      sku: '92100',
      barcode: '07290020531001',
      productName: null,
      rawQuantities: {
        caseQuantity: 2,
        unitsPerCase: 10,
        totalUnits: 20,
      },
    })
    expect(rows[0]?.rawText).not.toContain('99.99')
    expect(rows[2]?.printedRowNumber).toBeNull()
    expect(hasEnoughTargetedRows(rows)).toBe(false)
  })

  it('keeps targeted confidence by field and flags a low-confidence identifier', () => {
    const anchors = skuWords()
    anchors[0] = word('92100', 850, rowYs[0], 61)
    const calibration = selectTargetedSkuCalibration(page, anchors)!
    const rows = recoverTargetedMaayanRows(calibration, {
      barcodeWordsByAnchor: rowYs.map((y, index) => [
        word(`0729002053100${index + 1}`, 700, y, 91),
      ]),
      printedRowWords: rowYs.map((y, index) => word(String(index + 1), 950, y, 93)),
      quantityWords: {
        caseQuantity: rowYs.map((y) => word('2.00', 275, y, 84)),
        unitsPerCase: rowYs.map((y) => word('10.00', 205, y, 85)),
        totalUnits: rowYs.map((y) => word('20.00', 115, y, 86)),
      },
    })

    expect(rows[0]?.fieldConfidences).toEqual({
      printedRowNumber: 93,
      sku: 61,
      barcode: 91,
      productName: null,
      caseQuantity: 84,
      unitsPerCase: 85,
      totalUnits: 86,
    })
    expect(rows[0]?.issues).toContainEqual(
      expect.objectContaining({ code: 'LOW_FIELD_CONFIDENCE', field: 'sku' })
    )
  })

  it('keeps a same-row product name and its separate field confidence', () => {
    const calibration = selectTargetedSkuCalibration(page, skuWords())!
    const rows = recoverTargetedMaayanRows(calibration, {
      barcodeWordsByAnchor: rowYs.map((y, index) => [
        word(`0729002053100${index + 1}`, 700, y, 91),
      ]),
      productNameWordsByAnchor: rowYs.map((y, index) => [
        word(index === 0 ? 'טורבו' : `שם${index + 1}`, 540, y, 80),
        word(index === 0 ? 'וניל' : 'מוצר', 450, y, 84),
      ]),
      printedRowWords: rowYs.map((y, index) => word(String(index + 1), 950, y, 93)),
      quantityWords: {
        caseQuantity: rowYs.map((y) => word('2.00', 275, y, 84)),
        unitsPerCase: rowYs.map((y) => word('10.00', 205, y, 85)),
        totalUnits: rowYs.map((y) => word('20.00', 115, y, 86)),
      },
    })

    expect(rows[0]).toMatchObject({
      productName: 'טורבו וניל',
      fieldConfidences: expect.objectContaining({ productName: 82 }),
    })
    expect(rows[0]?.rawText).toContain('טורבו וניל')
    expect(rows[0]?.issues).not.toContainEqual(
      expect.objectContaining({ code: 'MISSING_PRODUCT_NAME', field: 'productName' })
    )
  })

  it('keeps an adjacent Latin phrase left-to-right inside a Hebrew product name', () => {
    const calibration = selectTargetedSkuCalibration(page, skuWords())!
    const rows = recoverTargetedMaayanRows(calibration, {
      barcodeWordsByAnchor: rowYs.map((y, index) => [
        word(`0729002053100${index + 1}`, 700, y, 91),
      ]),
      productNameWordsByAnchor: rowYs.map((y, index) =>
        index === 0
          ? [
              word('גלידת', 610, y, 86),
              // The visual RTL order is Cola then Coca; the Latin run must
              // remain its natural left-to-right order in the draft.
              word('Cola', 540, y, 87),
              word('Coca', 470, y, 88),
            ]
          : [word(`מוצר${index + 1}`, 540, y, 82)]
      ),
      printedRowWords: rowYs.map((y, index) => word(String(index + 1), 950, y, 93)),
      quantityWords: {
        caseQuantity: rowYs.map((y) => word('2.00', 275, y, 84)),
        unitsPerCase: rowYs.map((y) => word('10.00', 205, y, 85)),
        totalUnits: rowYs.map((y) => word('20.00', 115, y, 86)),
      },
    })

    expect(rows[0]?.productName).toBe('גלידת Coca Cola')
  })
})
