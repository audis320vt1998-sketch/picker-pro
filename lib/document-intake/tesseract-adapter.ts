import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Tesseract from 'tesseract.js'
import type { ImageDimensions } from './image-metadata'
import type { OcrPage, OcrWord } from './types'

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

  const worker = await Tesseract.createWorker('heb+eng', 1, {
    cachePath,
    logger: () => {},
  })

  try {
    let result: Tesseract.RecognizeResult
    try {
      result = await worker.recognize(Buffer.from(image), {}, { blocks: true })
    } catch (error) {
      if (isImageDecodeFailure(error)) {
        throw new OcrImageDecodeError()
      }
      throw error
    }

    return {
      ...dimensions,
      words: result.data.words.filter(hasUsableWord).map(toOcrWord),
    }
  } finally {
    await worker.terminate()
  }
}
