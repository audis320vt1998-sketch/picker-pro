import type {
  BoundingBox,
  MaayanParsedRow,
  MaayanRawQuantities,
  OcrPage,
  OcrWord,
} from './types'

export interface OcrRectangle {
  left: number
  top: number
  width: number
  height: number
}

export interface TargetedSkuCalibration {
  anchors: readonly OcrWord[]
  skuCenterX: number
  rowPitch: number
  bodyBounds: BoundingBox
}

export type TargetedQuantityCenters = Record<
  keyof MaayanRawQuantities,
  number
>

export interface TargetedRecoveryPasses {
  barcodeWordsByAnchor: readonly (readonly OcrWord[])[]
  printedRowWords: readonly OcrWord[]
  quantityWords: Record<keyof MaayanRawQuantities, readonly OcrWord[]>
}

const EXPECTED_SKU_CENTER = 0.86
const MAX_SKU_CENTER_SHIFT = 0.065
const MIN_ANCHORS = 4
const SKU_SCAN_BOUNDS = {
  xMin: 0.7,
  xMax: 0.96,
  yMin: 0.18,
  yMax: 0.75,
} as const
const QUANTITY_SCAN_BOUNDS = {
  xMin: 0.04,
  xMax: 0.36,
} as const
const QUANTITY_OFFSETS_FROM_SKU: TargetedQuantityCenters = {
  caseQuantity: -0.5775,
  unitsPerCase: -0.6475,
  totalUnits: -0.735,
}
const QUANTITY_CROP_WIDTH: Record<keyof MaayanRawQuantities, number> = {
  caseQuantity: 0.1,
  unitsPerCase: 0.09,
  totalUnits: 0.09,
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function centerX(word: OcrWord): number {
  return (word.boundingBox.x0 + word.boundingBox.x1) / 2
}

function centerY(word: OcrWord): number {
  return (word.boundingBox.y0 + word.boundingBox.y1) / 2
}

function token(word: OcrWord): string {
  return word.text.replace(/\s/g, '')
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

function average(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length
}

function rectangle(
  page: Pick<OcrPage, 'width' | 'height'>,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): OcrRectangle {
  const left = Math.floor(clamp(xMin, 0, page.width))
  const right = Math.ceil(clamp(xMax, left + 1, page.width))
  const top = Math.floor(clamp(yMin, 0, page.height))
  const bottom = Math.ceil(clamp(yMax, top + 1, page.height))

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}

interface WordCluster {
  center: number
  words: OcrWord[]
}

function clusterByX(words: readonly OcrWord[], tolerance: number): WordCluster[] {
  const clusters: WordCluster[] = []
  for (const word of [...words].sort((left, right) => centerX(left) - centerX(right))) {
    const current = clusters[clusters.length - 1]
    if (!current || Math.abs(centerX(word) - current.center) > tolerance) {
      clusters.push({ center: centerX(word), words: [word] })
      continue
    }

    current.words.push(word)
    current.center = average(current.words.map(centerX))
  }
  return clusters
}

function uniqueRowsByY(words: readonly OcrWord[], tolerance: number): OcrWord[] {
  const rows: OcrWord[] = []
  for (const word of [...words].sort((left, right) => centerY(left) - centerY(right))) {
    const current = rows[rows.length - 1]
    if (!current || Math.abs(centerY(word) - centerY(current)) > tolerance) {
      rows.push(word)
      continue
    }

    if (word.confidence > current.confidence) {
      rows[rows.length - 1] = word
    }
  }
  return rows
}

function rowPitch(words: readonly OcrWord[], pageHeight: number): number {
  const centers = words.map(centerY).sort((left, right) => left - right)
  const pitches = centers
    .slice(1)
    .map((value, index) => value - centers[index])
    .filter((value) => value > 0)
  return Math.max(median(pitches), pageHeight * 0.012)
}

function unionBounds(words: readonly OcrWord[]): BoundingBox {
  return {
    x0: Math.min(...words.map((word) => word.boundingBox.x0)),
    y0: Math.min(...words.map((word) => word.boundingBox.y0)),
    x1: Math.max(...words.map((word) => word.boundingBox.x1)),
    y1: Math.max(...words.map((word) => word.boundingBox.y1)),
  }
}

function isSku(word: OcrWord): boolean {
  return /^\d{4,7}$/.test(token(word)) && word.confidence >= 40
}

function isBarcode(word: OcrWord): boolean {
  return /^\d{10,15}$/.test(token(word)) && word.confidence >= 40
}

function isPrintedRow(word: OcrWord): boolean {
  return /^\d{1,3}$/.test(token(word)) && word.confidence >= 40
}

function isQuantity(word: OcrWord): boolean {
  return /^\d+(?:\.\d+)?$/.test(token(word)) && word.confidence >= 40
}

function quantityValue(word: OcrWord): number | null {
  if (!isQuantity(word)) {
    return null
  }

  const value = Number(token(word))
  return Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * The first numeric pass scans a broad but table-shaped SKU area. A column is
 * accepted only when at least four plausible SKU values form a vertically
 * aligned group near the expected column. This excludes isolated header and
 * customer numbers from calibration.
 */
export function targetedSkuScanRectangle(
  page: Pick<OcrPage, 'width' | 'height'>
): OcrRectangle {
  return rectangle(
    page,
    page.width * SKU_SCAN_BOUNDS.xMin,
    page.width * SKU_SCAN_BOUNDS.xMax,
    page.height * SKU_SCAN_BOUNDS.yMin,
    page.height * SKU_SCAN_BOUNDS.yMax
  )
}

export function selectTargetedSkuCalibration(
  page: Pick<OcrPage, 'width' | 'height'>,
  words: readonly OcrWord[]
): TargetedSkuCalibration | null {
  const candidates = clusterByX(
    words.filter(isSku),
    page.width * 0.03
  )
    .map((cluster) => {
      const anchors = uniqueRowsByY(cluster.words, page.height * 0.012)
      const center = median(anchors.map(centerX))
      const normalizedShift = center / page.width - EXPECTED_SKU_CENTER
      const pitch = rowPitch(anchors, page.height)
      const verticalSpan =
        anchors.length > 1
          ? centerY(anchors[anchors.length - 1]) - centerY(anchors[0])
          : 0

      return {
        anchors,
        center,
        normalizedShift,
        pitch,
        verticalSpan,
        averageConfidence: average(anchors.map((word) => word.confidence)),
      }
    })
    .filter(
      (candidate) =>
        candidate.anchors.length >= MIN_ANCHORS &&
        Math.abs(candidate.normalizedShift) <= MAX_SKU_CENTER_SHIFT &&
        candidate.verticalSpan >= page.height * 0.05
    )
    .sort(
      (left, right) =>
        right.anchors.length - left.anchors.length ||
        right.averageConfidence - left.averageConfidence ||
        Math.abs(left.normalizedShift) - Math.abs(right.normalizedShift)
    )

  const best = candidates[0]
  if (!best) {
    return null
  }

  const yPadding = best.pitch * 0.6
  return {
    anchors: best.anchors,
    skuCenterX: best.center,
    rowPitch: best.pitch,
    bodyBounds: {
      x0: 0,
      y0: clamp(centerY(best.anchors[0]) - yPadding, 0, page.height),
      x1: page.width,
      y1: clamp(
        centerY(best.anchors[best.anchors.length - 1]) + yPadding,
        0,
        page.height
      ),
    },
  }
}

/**
 * Uses each already-calibrated SKU line to constrain barcode OCR. The region
 * is deliberately narrow enough to exclude pack notation in product names.
 */
export function targetedBarcodeRectangle(
  page: Pick<OcrPage, 'width' | 'height'>,
  calibration: TargetedSkuCalibration,
  anchor: OcrWord
): OcrRectangle {
  const center = centerX(anchor) - page.width * 0.14
  const halfWidth = page.width * 0.09
  const halfHeight = Math.max(calibration.rowPitch * 0.35, 35)
  return rectangle(
    page,
    center - halfWidth,
    center + halfWidth,
    centerY(anchor) - halfHeight,
    centerY(anchor) + halfHeight
  )
}

export function targetedPrintedRowRectangle(
  page: Pick<OcrPage, 'width' | 'height'>,
  calibration: TargetedSkuCalibration
): OcrRectangle {
  const center = calibration.skuCenterX + page.width * 0.1
  const halfWidth = page.width * 0.05
  return rectangle(
    page,
    center - halfWidth,
    center + halfWidth,
    calibration.bodyBounds.y0,
    calibration.bodyBounds.y1
  )
}

export function targetedQuantityScoutRectangle(
  page: Pick<OcrPage, 'width' | 'height'>,
  calibration: TargetedSkuCalibration
): OcrRectangle {
  return rectangle(
    page,
    page.width * QUANTITY_SCAN_BOUNDS.xMin,
    page.width * QUANTITY_SCAN_BOUNDS.xMax,
    calibration.bodyBounds.y0,
    calibration.bodyBounds.y1
  )
}

/**
 * Finds the three quantity columns from a table-only numeric scout pass. Each
 * chosen column must be a repeated, vertically aligned numeric group. This
 * makes a nearby price column ineligible unless it actually fits the expected
 * position better than the source-quantity column.
 */
export function selectTargetedQuantityCenters(
  page: Pick<OcrPage, 'width' | 'height'>,
  calibration: TargetedSkuCalibration,
  words: readonly OcrWord[]
): TargetedQuantityCenters | null {
  const minimumRows = Math.min(
    MIN_ANCHORS,
    Math.max(2, Math.ceil(calibration.anchors.length * 0.6))
  )
  const clusters = clusterByX(
    words.filter(isQuantity),
    page.width * 0.025
  )
    .map((cluster) => ({
      center: median(cluster.words.map(centerX)),
      words: uniqueRowsByY(cluster.words, calibration.rowPitch * 0.35),
    }))
    .filter((cluster) => cluster.words.length >= minimumRows)

  const selected = new Set<number>()
  const centers = {} as TargetedQuantityCenters
  for (const field of [
    'totalUnits',
    'unitsPerCase',
    'caseQuantity',
  ] as const) {
    const expected = calibration.skuCenterX / page.width + QUANTITY_OFFSETS_FROM_SKU[field]
    const candidate = clusters
      .map((cluster, index) => ({
        ...cluster,
        index,
        distance: Math.abs(cluster.center / page.width - expected),
      }))
      .filter((cluster) => !selected.has(cluster.index) && cluster.distance <= 0.065)
      .sort(
        (left, right) =>
          left.distance - right.distance || right.words.length - left.words.length
      )[0]

    if (!candidate) {
      return null
    }

    selected.add(candidate.index)
    centers[field] = candidate.center
  }

  return (
    centers.totalUnits < centers.unitsPerCase &&
    centers.unitsPerCase < centers.caseQuantity
      ? centers
      : null
  )
}

export function targetedQuantityRectangle(
  page: Pick<OcrPage, 'width' | 'height'>,
  calibration: TargetedSkuCalibration,
  centers: TargetedQuantityCenters,
  field: keyof MaayanRawQuantities
): OcrRectangle {
  const halfWidth = (page.width * QUANTITY_CROP_WIDTH[field]) / 2
  return rectangle(
    page,
    centers[field] - halfWidth,
    centers[field] + halfWidth,
    calibration.bodyBounds.y0,
    calibration.bodyBounds.y1
  )
}

function oneMatchingWord(
  words: readonly OcrWord[],
  matches: (word: OcrWord) => boolean
): OcrWord | null {
  const candidates = words.filter(matches)
  return candidates.length === 1 ? candidates[0] : null
}

function nearbyQuantity(
  words: readonly OcrWord[],
  anchor: OcrWord,
  rowPitchValue: number
): { word: OcrWord; value: number } | null {
  const candidates = words
    .filter((word) => Math.abs(centerY(word) - centerY(anchor)) <= rowPitchValue * 0.35)
    .map((word) => ({ word, value: quantityValue(word) }))
    .filter(
      (candidate): candidate is { word: OcrWord; value: number } =>
        candidate.value !== null
    )
  return candidates.length === 1 ? candidates[0] : null
}

function nearbyPrintedRow(
  words: readonly OcrWord[],
  anchor: OcrWord,
  rowPitchValue: number
): OcrWord | null {
  return oneMatchingWord(
    words.filter((word) => Math.abs(centerY(word) - centerY(anchor)) <= rowPitchValue * 0.35),
    isPrintedRow
  )
}

function numericIssue(
  field: keyof MaayanRawQuantities,
  words: readonly OcrWord[],
  anchor: OcrWord,
  rowPitchValue: number
): MaayanParsedRow['issues'][number] | null {
  const candidates = words.filter(
    (word) =>
      Math.abs(centerY(word) - centerY(anchor)) <= rowPitchValue * 0.35 &&
      quantityValue(word) !== null
  )
  return candidates.length > 1
    ? {
        code: 'AMBIGUOUS_NUMERIC_FIELD',
        field,
        message: `${field} has multiple targeted OCR values near one SKU row.`,
      }
    : null
}

/**
 * Joins only OCR values that share the same calibrated row. SKU and barcode
 * stay strings, all three quantities remain source values, and a row with an
 * incomplete quantity triplet is omitted rather than guessed.
 */
export function recoverTargetedMaayanRows(
  calibration: TargetedSkuCalibration,
  passes: TargetedRecoveryPasses
): MaayanParsedRow[] {
  return calibration.anchors.flatMap((anchor, index) => {
    const barcode = oneMatchingWord(passes.barcodeWordsByAnchor[index] ?? [], isBarcode)
    if (!barcode) {
      return []
    }

    const quantities = {
      caseQuantity: nearbyQuantity(
        passes.quantityWords.caseQuantity,
        anchor,
        calibration.rowPitch
      ),
      unitsPerCase: nearbyQuantity(
        passes.quantityWords.unitsPerCase,
        anchor,
        calibration.rowPitch
      ),
      totalUnits: nearbyQuantity(
        passes.quantityWords.totalUnits,
        anchor,
        calibration.rowPitch
      ),
    }
    if (!quantities.caseQuantity || !quantities.unitsPerCase || !quantities.totalUnits) {
      return []
    }

    const printedRow = nearbyPrintedRow(
      passes.printedRowWords,
      anchor,
      calibration.rowPitch
    )
    const rawQuantities: MaayanRawQuantities = {
      caseQuantity: quantities.caseQuantity.value,
      unitsPerCase: quantities.unitsPerCase.value,
      totalUnits: quantities.totalUnits.value,
    }
    const sourceWords = [
      anchor,
      barcode,
      quantities.caseQuantity.word,
      quantities.unitsPerCase.word,
      quantities.totalUnits.word,
      ...(printedRow ? [printedRow] : []),
    ]
    const issues = [
      {
        code: 'MISSING_PRODUCT_NAME' as const,
        field: 'productName' as const,
        message:
          'Product name is not included in the targeted numeric OCR draft and must be checked manually.',
      },
      ...(['caseQuantity', 'unitsPerCase', 'totalUnits'] as const)
        .map((field) =>
          numericIssue(
            field,
            passes.quantityWords[field],
            anchor,
            calibration.rowPitch
          )
        )
        .filter(
          (issue): issue is MaayanParsedRow['issues'][number] => issue !== null
        ),
    ]

    return [
      {
        printedRowNumber: printedRow ? Number(token(printedRow)) : null,
        sku: token(anchor),
        barcode: token(barcode),
        trayBarcode: null,
        productName: null,
        rawQuantities,
        rawText: sourceWords.map(token).join(' '),
        confidence: average(sourceWords.map((word) => word.confidence)),
        boundingBox: unionBounds(sourceWords),
        issues,
      },
    ]
  })
}

export function hasEnoughTargetedRows(rows: readonly MaayanParsedRow[]): boolean {
  return rows.length >= MIN_ANCHORS
}
