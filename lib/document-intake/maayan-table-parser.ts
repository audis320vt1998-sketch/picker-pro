import type {
  BoundingBox,
  ColumnBand,
  MaayanParseIssue,
  MaayanParsedRow,
  MaayanRawQuantities,
  MaayanTableLayout,
  OcrWord,
} from './types'
import { lowConfidenceFieldIssues } from './field-confidence'

interface OcrLine {
  words: OcrWord[]
  centerY: number
  boundingBox: BoundingBox
}

interface RowGroup {
  lines: OcrLine[]
  boundingBox: BoundingBox
}

function centerY(word: OcrWord): number {
  return (word.boundingBox.y0 + word.boundingBox.y1) / 2
}

function centerX(word: OcrWord): number {
  return (word.boundingBox.x0 + word.boundingBox.x1) / 2
}

function unionBounds(bounds: readonly BoundingBox[]): BoundingBox {
  return {
    x0: Math.min(...bounds.map((bound) => bound.x0)),
    y0: Math.min(...bounds.map((bound) => bound.y0)),
    x1: Math.max(...bounds.map((bound) => bound.x1)),
    y1: Math.max(...bounds.map((bound) => bound.y1)),
  }
}

function isInsideBounds(word: OcrWord, bounds: BoundingBox): boolean {
  const x = centerX(word)
  const y = centerY(word)
  return x >= bounds.x0 && x <= bounds.x1 && y >= bounds.y0 && y <= bounds.y1
}

function belongsToBand(word: OcrWord, band: ColumnBand): boolean {
  const x = centerX(word)
  return x >= band.xMin && x <= band.xMax
}

function groupLines(
  words: readonly OcrWord[],
  lineMergeDistance: number
): OcrLine[] {
  const sorted = [...words].sort((left, right) => centerY(left) - centerY(right))
  const groups: OcrWord[][] = []

  for (const word of sorted) {
    const currentGroup = groups[groups.length - 1]
    if (!currentGroup) {
      groups.push([word])
      continue
    }

    const currentCenterY =
      currentGroup.reduce((sum, item) => sum + centerY(item), 0) /
      currentGroup.length
    if (Math.abs(centerY(word) - currentCenterY) <= lineMergeDistance) {
      currentGroup.push(word)
    } else {
      groups.push([word])
    }
  }

  return groups.map((lineWords) => ({
    words: lineWords,
    centerY:
      lineWords.reduce((sum, word) => sum + centerY(word), 0) /
      lineWords.length,
    boundingBox: unionBounds(lineWords.map((word) => word.boundingBox)),
  }))
}

function numericToken(value: string): string | null {
  const normalized = value.replace(/,/g, '').trim()
  return /^\d+(?:\.\d+)?$/.test(normalized) ? normalized : null
}

function identifierToken(value: string): string | null {
  const normalized = value.replace(/\s/g, '')
  return /^\d+$/.test(normalized) ? normalized : null
}

function isExpectedIdentifier(
  value: string,
  field: 'sku' | 'barcode'
): boolean {
  return field === 'sku'
    ? value.length >= 4 && value.length <= 7
    : value.length >= 10 && value.length <= 15
}

function wordsForBand(words: readonly OcrWord[], band: ColumnBand): OcrWord[] {
  return words.filter((word) => belongsToBand(word, band))
}

function textForBand(words: readonly OcrWord[], band: ColumnBand): string {
  return wordsForBand(words, band)
    .sort((left, right) => centerX(right) - centerX(left))
    .map((word) => word.text.trim())
    .filter(Boolean)
    .join(' ')
}

function textForLines(lines: readonly OcrLine[], band: ColumnBand): string {
  return lines
    .map((line) => textForBand(line.words, band))
    .filter(Boolean)
    .join(' ')
}

function traceTextForLines(
  lines: readonly OcrLine[],
  layout: MaayanTableLayout
): string {
  const visibleBands = Object.values(layout.columns)

  return lines
    .flatMap((line) =>
      line.words
        .filter((word) => visibleBands.some((band) => belongsToBand(word, band)))
        .sort((left, right) => centerX(right) - centerX(left))
    )
    .map((word) => word.text.trim())
    .filter(Boolean)
    .join(' ')
}

function numericCandidateWords(
  words: readonly OcrWord[],
  band: ColumnBand
): OcrWord[] {
  return wordsForBand(words, band).filter((word) => numericToken(word.text) !== null)
}

function numericValueFromCandidates(
  candidates: readonly OcrWord[],
  field: 'printedRowNumber' | keyof MaayanRawQuantities,
  issues: MaayanParseIssue[]
): number | null {
  if (candidates.length === 0) {
    return null
  }

  if (candidates.length > 1) {
    issues.push({
      code: 'AMBIGUOUS_NUMERIC_FIELD',
      field,
      message: `${field} contains more than one numeric OCR token.`,
    })
    return null
  }

  const numeric = numericToken(candidates[0].text)
  if (!numeric) {
    return null
  }

  const value = Number(numeric)
  if (!Number.isFinite(value) || value < 0) {
    issues.push({
      code: 'INVALID_NUMERIC_FIELD',
      field,
      message: `${field} is not a non-negative finite number.`,
    })
    return null
  }

  if (
    field === 'printedRowNumber' &&
    (!Number.isInteger(value) || value < 1 || value > 999)
  ) {
    issues.push({
      code: 'INVALID_NUMERIC_FIELD',
      field,
      message: 'printedRowNumber must be an integer between 1 and 999.',
    })
    return null
  }

  return value
}

function numericValue(
  words: readonly OcrWord[],
  band: ColumnBand,
  field: 'printedRowNumber' | keyof MaayanRawQuantities,
  issues: MaayanParseIssue[]
): number | null {
  return numericValueFromCandidates(numericCandidateWords(words, band), field, issues)
}

function identifierCandidateWords(
  words: readonly OcrWord[],
  band: ColumnBand,
  field: 'sku' | 'barcode'
): OcrWord[] {
  return wordsForBand(words, band).filter((word) => {
    const candidate = identifierToken(word.text)
    return candidate !== null && isExpectedIdentifier(candidate, field)
  })
}

function identifierValueFromCandidates(
  candidates: readonly OcrWord[],
  field: 'sku' | 'barcode',
  issues: MaayanParseIssue[]
): string | null {
  if (candidates.length === 0) {
    issues.push({
      code: field === 'sku' ? 'MISSING_SKU' : 'MISSING_BARCODE',
      field,
      message: `${field} is missing from the OCR row.`,
    })
    return null
  }

  if (candidates.length > 1) {
    issues.push({
      code: 'AMBIGUOUS_NUMERIC_FIELD',
      field,
      message: `${field} contains more than one numeric OCR token.`,
    })
    return null
  }

  return identifierToken(candidates[0].text)
}

function identifierValue(
  words: readonly OcrWord[],
  band: ColumnBand,
  field: 'sku' | 'barcode',
  issues: MaayanParseIssue[]
): string | null {
  return identifierValueFromCandidates(
    identifierCandidateWords(words, band, field),
    field,
    issues
  )
}

function lineHasAnchor(line: OcrLine, layout: MaayanTableLayout): boolean {
  const printedRowNumber = numericValue(
    line.words,
    layout.columns.printedRowNumber,
    'printedRowNumber',
    []
  )
  const sku = identifierValue(line.words, layout.columns.sku, 'sku', [])
  const barcode = identifierValue(line.words, layout.columns.barcode, 'barcode', [])
  return printedRowNumber !== null && sku !== null && barcode !== null
}

function lineHasIdentifier(line: OcrLine, layout: MaayanTableLayout): boolean {
  return (
    identifierValue(line.words, layout.columns.sku, 'sku', []) !== null ||
    identifierValue(line.words, layout.columns.barcode, 'barcode', []) !== null
  )
}

function lineHasProductName(line: OcrLine, layout: MaayanTableLayout): boolean {
  return textForBand(line.words, layout.columns.productName).length > 0
}

function groupRows(lines: readonly OcrLine[], layout: MaayanTableLayout): RowGroup[] {
  const rows: RowGroup[] = []

  for (const line of lines) {
    if (lineHasAnchor(line, layout)) {
      rows.push({ lines: [line], boundingBox: line.boundingBox })
      continue
    }

    const currentRow = rows[rows.length - 1]
    const previousLine = currentRow?.lines[currentRow.lines.length - 1]
    const isContinuation =
      currentRow !== undefined &&
      previousLine !== undefined &&
      !lineHasIdentifier(line, layout) &&
      lineHasProductName(line, layout) &&
      line.centerY - previousLine.centerY <= layout.continuationDistance

    if (isContinuation && currentRow) {
      currentRow.lines.push(line)
      currentRow.boundingBox = unionBounds(
        currentRow.lines.map((rowLine) => rowLine.boundingBox)
      )
    }
  }

  return rows
}

function averageConfidence(words: readonly OcrWord[]): number {
  if (words.length === 0) {
    return 0
  }

  return words.reduce((sum, word) => sum + word.confidence, 0) / words.length
}

function fieldConfidence(
  value: string | number | null,
  sourceWords: readonly OcrWord[]
): number | null {
  return value === null || sourceWords.length === 0
    ? null
    : averageConfidence(sourceWords)
}

function parseRow(row: RowGroup, layout: MaayanTableLayout): MaayanParsedRow {
  const words = row.lines.flatMap((line) => line.words)
  const issues: MaayanParseIssue[] = []
  const printedRowWords = numericCandidateWords(words, layout.columns.printedRowNumber)
  const skuWords = identifierCandidateWords(words, layout.columns.sku, 'sku')
  const barcodeWords = identifierCandidateWords(words, layout.columns.barcode, 'barcode')
  const trayBarcodeWords = identifierCandidateWords(
    words,
    layout.columns.trayBarcode,
    'barcode'
  )
  const productNameWords = wordsForBand(words, layout.columns.productName)
  const caseQuantityWords = numericCandidateWords(words, layout.columns.caseQuantity)
  const unitsPerCaseWords = numericCandidateWords(words, layout.columns.unitsPerCase)
  const totalUnitsWords = numericCandidateWords(words, layout.columns.totalUnits)
  const productName = textForLines(row.lines, layout.columns.productName) || null
  if (!productName) {
    issues.push({
      code: 'MISSING_PRODUCT_NAME',
      field: 'productName',
      message: 'productName is missing from the OCR row.',
    })
  }

  const rawQuantities: MaayanRawQuantities = {
    caseQuantity: numericValueFromCandidates(
      caseQuantityWords,
      'caseQuantity',
      issues
    ),
    unitsPerCase: numericValueFromCandidates(
      unitsPerCaseWords,
      'unitsPerCase',
      issues
    ),
    totalUnits: numericValueFromCandidates(
      totalUnitsWords,
      'totalUnits',
      issues
    ),
  }

  const printedRowNumber = numericValueFromCandidates(
    printedRowWords,
    'printedRowNumber',
    issues
  )
  const sku = identifierValueFromCandidates(skuWords, 'sku', issues)
  const barcode = identifierValueFromCandidates(barcodeWords, 'barcode', issues)
  const trayBarcode = identifierValueFromCandidates(trayBarcodeWords, 'barcode', [])
  const fieldConfidences = {
    printedRowNumber: fieldConfidence(printedRowNumber, printedRowWords),
    sku: fieldConfidence(sku, skuWords),
    barcode: fieldConfidence(barcode, barcodeWords),
    productName: fieldConfidence(productName, productNameWords),
    caseQuantity: fieldConfidence(rawQuantities.caseQuantity, caseQuantityWords),
    unitsPerCase: fieldConfidence(rawQuantities.unitsPerCase, unitsPerCaseWords),
    totalUnits: fieldConfidence(rawQuantities.totalUnits, totalUnitsWords),
  }
  issues.push(...lowConfidenceFieldIssues(fieldConfidences))

  return {
    printedRowNumber,
    sku,
    barcode,
    trayBarcode,
    productName,
    rawQuantities,
    rawText: traceTextForLines(row.lines, layout),
    confidence: averageConfidence(words),
    fieldConfidences,
    boundingBox: row.boundingBox,
    issues,
  }
}

/**
 * Parses Maayan's RTL table using OCR word coordinates. It deliberately emits
 * the three source quantity fields unchanged; conversion into cases or units
 * is a later human-reviewed step.
 */
export function parseMaayanTable(
  words: readonly OcrWord[],
  layout: MaayanTableLayout
): MaayanParsedRow[] {
  const tableWords = words.filter((word) => isInsideBounds(word, layout.bodyBounds))
  const lines = groupLines(tableWords, layout.lineMergeDistance)
  const rows = groupRows(lines, layout)
  return rows.map((row) => parseRow(row, layout))
}
