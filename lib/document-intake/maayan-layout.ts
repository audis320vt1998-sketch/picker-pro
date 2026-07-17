import type {
  BoundingBox,
  ColumnBand,
  MaayanTableLayout,
  OcrPage,
  OcrWord,
} from './types'

export const MAAYAN_PRICE_OFFER_PROFILE = 'MAAYAN_PRICE_OFFER_V1' as const

const MINIMUM_IMAGE_WIDTH = 1200
const MINIMUM_IMAGE_HEIGHT = 1600

const NORMALIZED_COLUMNS = {
  printedRowNumber: [0.92, 1],
  sku: [0.8, 0.92],
  barcode: [0.62, 0.8],
  productName: [0.39, 0.67],
  trayBarcode: [0.3, 0.4],
  caseQuantity: [0.245, 0.32],
  unitsPerCase: [0.175, 0.25],
  totalUnits: [0.075, 0.175],
} as const

/**
 * Close-up photos can be taken a few percent to either side of the canonical
 * table position. We score these small horizontal offsets using the same
 * strict printed-row/SKU/barcode anchors; an offset is never selected from
 * product text or quantities alone.
 */
const HORIZONTAL_COLUMN_SHIFTS = [
  0,
  -0.01,
  0.01,
  -0.02,
  0.02,
  -0.03,
  0.03,
  -0.04,
  0.04,
  -0.05,
  0.05,
  -0.06,
  0.06,
] as const

interface OcrLine {
  words: readonly OcrWord[]
  bounds: BoundingBox
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function centerX(word: OcrWord): number {
  return (word.boundingBox.x0 + word.boundingBox.x1) / 2
}

function centerY(word: OcrWord): number {
  return (word.boundingBox.y0 + word.boundingBox.y1) / 2
}

function wordHeight(word: OcrWord): number {
  return word.boundingBox.y1 - word.boundingBox.y0
}

function isInsideBand(word: OcrWord, band: ColumnBand): boolean {
  const x = centerX(word)
  return x >= band.xMin && x <= band.xMax
}

function normalizedBand(
  width: number,
  range: readonly [number, number],
  horizontalShift = 0
): ColumnBand {
  return {
    xMin: width * clamp(range[0] + horizontalShift, 0, 1),
    xMax: width * clamp(range[1] + horizontalShift, 0, 1),
  }
}

function numericIdentifier(value: string): string | null {
  const normalized = value.replace(/\s/g, '')
  return /^\d+$/.test(normalized) ? normalized : null
}

function hasSkuCandidate(words: readonly OcrWord[], band: ColumnBand): boolean {
  return words.some((word) => {
    const candidate = numericIdentifier(word.text)
    return candidate !== null && candidate.length >= 4 && candidate.length <= 7 && isInsideBand(word, band)
  })
}

function hasBarcodeCandidate(words: readonly OcrWord[], band: ColumnBand): boolean {
  return words.some((word) => {
    const candidate = numericIdentifier(word.text)
    return candidate !== null && candidate.length >= 10 && candidate.length <= 15 && isInsideBand(word, band)
  })
}

function hasPrintedRowCandidate(words: readonly OcrWord[], band: ColumnBand): boolean {
  return words.some((word) => {
    const candidate = numericIdentifier(word.text)
    return candidate !== null && candidate.length >= 1 && candidate.length <= 3 && isInsideBand(word, band)
  })
}

function unionBounds(words: readonly OcrWord[]): BoundingBox {
  return {
    x0: Math.min(...words.map((word) => word.boundingBox.x0)),
    y0: Math.min(...words.map((word) => word.boundingBox.y0)),
    x1: Math.max(...words.map((word) => word.boundingBox.x1)),
    y1: Math.max(...words.map((word) => word.boundingBox.y1)),
  }
}

function groupLines(words: readonly OcrWord[], lineMergeDistance: number): OcrLine[] {
  const sorted = [...words].sort((left, right) => centerY(left) - centerY(right))
  const groups: OcrWord[][] = []

  for (const word of sorted) {
    const current = groups[groups.length - 1]
    if (!current) {
      groups.push([word])
      continue
    }

    const currentCenter =
      current.reduce((sum, item) => sum + centerY(item), 0) / current.length
    if (Math.abs(centerY(word) - currentCenter) <= lineMergeDistance) {
      current.push(word)
    } else {
      groups.push([word])
    }
  }

  return groups.map((lineWords) => ({
    words: lineWords,
    bounds: unionBounds(lineWords),
  }))
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function createColumns(
  width: number,
  horizontalShift = 0
): MaayanTableLayout['columns'] {
  return {
    printedRowNumber: normalizedBand(
      width,
      NORMALIZED_COLUMNS.printedRowNumber,
      horizontalShift
    ),
    sku: normalizedBand(width, NORMALIZED_COLUMNS.sku, horizontalShift),
    barcode: normalizedBand(width, NORMALIZED_COLUMNS.barcode, horizontalShift),
    productName: normalizedBand(
      width,
      NORMALIZED_COLUMNS.productName,
      horizontalShift
    ),
    trayBarcode: normalizedBand(
      width,
      NORMALIZED_COLUMNS.trayBarcode,
      horizontalShift
    ),
    caseQuantity: normalizedBand(
      width,
      NORMALIZED_COLUMNS.caseQuantity,
      horizontalShift
    ),
    unitsPerCase: normalizedBand(
      width,
      NORMALIZED_COLUMNS.unitsPerCase,
      horizontalShift
    ),
    totalUnits: normalizedBand(
      width,
      NORMALIZED_COLUMNS.totalUnits,
      horizontalShift
    ),
  }
}

function anchorsForColumns(
  lines: readonly OcrLine[],
  columns: MaayanTableLayout['columns']
): OcrLine[] {
  return lines.filter(
    (line) =>
      hasPrintedRowCandidate(line.words, columns.printedRowNumber) &&
      hasSkuCandidate(line.words, columns.sku) &&
      hasBarcodeCandidate(line.words, columns.barcode)
  )
}

export function hasMinimumMaayanImageResolution(page: Pick<OcrPage, 'width' | 'height'>): boolean {
  return page.width >= MINIMUM_IMAGE_WIDTH && page.height >= MINIMUM_IMAGE_HEIGHT
}

/**
 * Builds the calibrated RTL Maayan profile only after finding a traceable
 * printed row number, SKU, and barcode trio in the expected table columns. The
 * vertical bounds come from those anchors rather than from a page-wide fixed
 * crop, because the supplied photos vary between full-page and close-up
 * captures.
 */
export function detectMaayanTableLayout(page: OcrPage): MaayanTableLayout | null {
  if (!hasMinimumMaayanImageResolution(page)) {
    return null
  }

  const lineMergeDistance = clamp(page.height * 0.004, 8, 22)
  const lines = groupLines(page.words, lineMergeDistance)
  const bestCandidate = HORIZONTAL_COLUMN_SHIFTS.map((horizontalShift) => {
    const columns = createColumns(page.width, horizontalShift)
    return {
      horizontalShift,
      columns,
      anchors: anchorsForColumns(lines, columns),
    }
  }).reduce(
    (best, candidate) =>
      candidate.anchors.length > best.anchors.length ||
      (candidate.anchors.length === best.anchors.length &&
        Math.abs(candidate.horizontalShift) < Math.abs(best.horizontalShift))
        ? candidate
        : best
  )
  const { columns, anchors } = bestCandidate

  if (anchors.length === 0) {
    return null
  }

  const anchorWordHeights = anchors.flatMap((line) => line.words.map(wordHeight))
  const verticalMargin = clamp(
    Math.max(median(anchorWordHeights) * 3, page.height * 0.018),
    36,
    120
  )
  const y0 = clamp(
    Math.min(...anchors.map((anchor) => anchor.bounds.y0)) - verticalMargin,
    0,
    page.height
  )
  const y1 = clamp(
    Math.max(...anchors.map((anchor) => anchor.bounds.y1)) + verticalMargin,
    0,
    page.height
  )

  return {
    bodyBounds: {
      x0: 0,
      y0,
      x1: page.width,
      y1,
    },
    lineMergeDistance,
    continuationDistance: clamp(page.height * 0.02, 32, 90),
    columns,
  }
}
