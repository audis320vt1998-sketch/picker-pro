import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Tesseract from 'tesseract.js'
import type { ImageDimensions } from './image-metadata'
import {
  hasEnoughTargetedRows,
  recoverTargetedMaayanRows,
  selectTargetedQuantityCenters,
  selectTargetedSkuCalibration,
  targetedBarcodeRectangle,
  targetedPrintedRowRectangle,
  targetedQuantityRectangle,
  targetedQuantityScoutRectangle,
  targetedSkuScanRectangle,
  type OcrRectangle,
} from './maayan-targeted-recovery'
import type { MaayanParsedRow, OcrPage, OcrWord } from './types'

const TARGETED_RECOVERY_BUDGET_MS = 35_000
const MAX_TARGETED_ROW_ATTEMPTS = 12

export class OcrImageDecodeError extends Error {
  constructor() {
    super('The image could not be decoded by the OCR engine.')
    this.name = 'OcrImageDecodeError'
  }
}

function isImageDecodeFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /error attempting to read image|failed to decode image|invalid image/i.test(
    message
  )
}

function hasUsableWord(word: Tesseract.Word): boolean {
  const { bbox } = word
  return (
    word.text.trim().length > 0 &&
    Number.isFinite(word.confidence) &&
    Number.isFinite(bbox.x0) &&
    Number.isFinite(bbox.y0) &&
    Number.isFinite(bbox.x1) &&
    Number.isFinite(bbox.y1) &&
    bbox.x1 > bbox.x0 &&
    bbox.y1 > bbox.y0
  )
}

function toOcrWord(word: Tesseract.Word): OcrWord {
  return {
    text: word.text,
    confidence: word.confidence,
    boundingBox: {
      x0: word.bbox.x0,
      y0: word.bbox.y0,
      x1: word.bbox.x1,
      y1: word.bbox.y1,
    },
  }
}

function ocrCachePath(): string {
  return process.env.PICKER_PRO_OCR_CACHE ?? join(tmpdir(), 'picker-pro-ocr')
}

function toOcrWords(result: Tesseract.RecognizeResult): OcrWord[] {
  return result.data.words.filter(hasUsableWord).map(toOcrWord)
}

function hasBudget(startedAt: number): boolean {
  return Date.now() - startedAt < TARGETED_RECOVERY_BUDGET_MS
}

async function recognizeNumericRectangle(
  worker: Tesseract.Worker,
  image: Buffer,
  rectangle: OcrRectangle,
  psm: Tesseract.PSM,
  whitelist: string
): Promise<OcrWord[]> {
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    tessedit_char_whitelist: whitelist,
  })
  const result = await worker.recognize(image, { rectangle }, { blocks: true })
  return toOcrWords(result)
}

async function tryTargetedMaayanRecovery(
  worker: Tesseract.Worker,
  image: Buffer,
  dimensions: ImageDimensions,
  startedAt: number
): Promise<MaayanParsedRow[] | null> {
  if (!hasBudget(startedAt)) {
    return null
  }

  const skuWords = await recognizeNumericRectangle(
    worker,
    image,
    targetedSkuScanRectangle(dimensions),
    Tesseract.PSM.SPARSE_TEXT,
    '0123456789'
  )
  const calibration = selectTargetedSkuCalibration(dimensions, skuWords)
  if (
    !calibration ||
    calibration.anchors.length > MAX_TARGETED_ROW_ATTEMPTS ||
    !hasBudget(startedAt)
  ) {
    return null
  }

  const barcodeWordsByAnchor: OcrWord[][] = []
  for (const anchor of calibration.anchors) {
    if (!hasBudget(startedAt)) {
      return null
    }
    barcodeWordsByAnchor.push(
      await recognizeNumericRectangle(
        worker,
        image,
        targetedBarcodeRectangle(dimensions, calibration, anchor),
        Tesseract.PSM.SINGLE_LINE,
        '0123456789'
      )
    )
  }

  if (!hasBudget(startedAt)) {
    return null
  }
  const printedRowWords = await recognizeNumericRectangle(
    worker,
    image,
    targetedPrintedRowRectangle(dimensions, calibration),
    Tesseract.PSM.SINGLE_BLOCK,
    '0123456789'
  )

  if (!hasBudget(startedAt)) {
    return null
  }
  const quantityScoutWords = await recognizeNumericRectangle(
    worker,
    image,
    targetedQuantityScoutRectangle(dimensions, calibration),
    Tesseract.PSM.SPARSE_TEXT,
    '0123456789.'
  )
  const quantityCenters = selectTargetedQuantityCenters(
    dimensions,
    calibration,
    quantityScoutWords
  )
  if (!quantityCenters) {
    return null
  }

  const quantityWords = {
    caseQuantity: [] as OcrWord[],
    unitsPerCase: [] as OcrWord[],
    totalUnits: [] as OcrWord[],
  }
  for (const field of [
    'caseQuantity',
    'unitsPerCase',
    'totalUnits',
  ] as const) {
    if (!hasBudget(startedAt)) {
      return null
    }
    quantityWords[field] = await recognizeNumericRectangle(
      worker,
      image,
      targetedQuantityRectangle(dimensions, calibration, quantityCenters, field),
      Tesseract.PSM.SPARSE_TEXT,
      '0123456789.'
    )
  }

  const recoveredRows = recoverTargetedMaayanRows(calibration, {
    barcodeWordsByAnchor,
    printedRowWords,
    quantityWords,
  })
  return hasEnoughTargetedRows(recoveredRows) ? recoveredRows : null
}

async function recognizeFullPage(
  worker: Tesseract.Worker,
  image: Buffer,
  dimensions: ImageDimensions
): Promise<OcrPage> {
  await worker.reinitialize('heb+eng')
  const result = await worker.recognize(image, {}, { blocks: true })
  return {
    ...dimensions,
    words: toOcrWords(result),
  }
}

/**
 * Runs OCR in memory and stores only language-model cache files outside the
 * repository. The caller is responsible for immediately discarding returned
 * words after constructing the review-only response.
 */
export async function recognizeTesseractImage(
  image: Uint8Array,
  dimensions: ImageDimensions
): Promise<OcrPage> {
  const cachePath = ocrCachePath()
  await mkdir(cachePath, { recursive: true })

  const worker = await Tesseract.createWorker('eng', 1, {
    cachePath,
    logger: () => {},
  })

  try {
    const imageBuffer = Buffer.from(image)
    let recoveredRows: MaayanParsedRow[] | null = null
    try {
      const startedAt = Date.now()
      recoveredRows = await tryTargetedMaayanRecovery(
        worker,
        imageBuffer,
        dimensions,
        startedAt
      )
    } catch (error) {
      if (isImageDecodeFailure(error)) {
        throw new OcrImageDecodeError()
      }
      // A targeted pass is an optional draft enhancement. Preserve the full
      // page OCR fallback if one narrow numeric crop cannot be read.
      recoveredRows = null
    }

    if (recoveredRows) {
      return {
        ...dimensions,
        words: [],
        recoveredRows,
      }
    }

    try {
      return await recognizeFullPage(worker, imageBuffer, dimensions)
    } catch (error) {
      if (isImageDecodeFailure(error)) {
        throw new OcrImageDecodeError()
      }
      throw error
    }
  } finally {
    await worker.terminate()
  }
}
