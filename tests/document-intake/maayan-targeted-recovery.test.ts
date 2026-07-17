import type { OcrPage, OcrWord } from '../../lib/document-intake'
import {
  hasEnoughTargetedRows,
  recoverTargetedMaayanRows,
  selectTargetedQuantityCenters,
  selectTargetedSkuCalibration,
  targetedBarcodeRectangle,
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
})
