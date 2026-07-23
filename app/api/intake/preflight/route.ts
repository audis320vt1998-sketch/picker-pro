import { NextRequest, NextResponse } from 'next/server'
import {
  hasMinimumMaayanImageResolution,
  isSupportedPreflightImageType,
  MAX_PREFLIGHT_IMAGE_BYTES,
  MAX_PREFLIGHT_IMAGE_PIXELS,
  MAX_PREFLIGHT_MULTIPART_BYTES,
  preflightMaayanOcrPage,
  readImageMetadata,
} from '@/lib/document-intake'
import { recognizeTesseractImage } from '../../../../lib/document-intake/tesseract-adapter'
import {
  OcrPreflightBusyError,
  OcrPreflightTimeoutError,
  runOcrPreflight,
} from '../../../../lib/document-intake/ocr-capacity'

export const runtime = 'nodejs'

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== 'string' && typeof value.arrayBuffer === 'function'
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function isOcrImageDecodeError(error: unknown): boolean {
  return error instanceof Error && error.name === 'OcrImageDecodeError'
}

/**
 * Creates an ephemeral, review-only OCR draft for one image. It does not
 * persist the upload, return a filename or document header, resolve products,
 * or create an operational pick list.
 */
export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PREFLIGHT_MULTIPART_BYTES
  ) {
    return noStoreJson(
      {
        error: 'The upload is too large for OCR preflight.',
        code: 'REQUEST_TOO_LARGE',
      },
      413
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return noStoreJson(
      {
        error: 'Request body must be multipart form data.',
        code: 'INVALID_PREFLIGHT_INPUT',
      },
      400
    )
  }

  const submitted = form.getAll('file')
  if (submitted.length === 0) {
    return noStoreJson(
      {
        error: 'Exactly one image file is required.',
        code: 'INVALID_PREFLIGHT_INPUT',
      },
      400
    )
  }
  if (submitted.length !== 1 || !isUploadedFile(submitted[0])) {
    return noStoreJson(
      {
        error: 'Exactly one image file is required.',
        code: 'INVALID_PREFLIGHT_INPUT',
      },
      400
    )
  }

  const file = submitted[0]
  if (!isSupportedPreflightImageType(file.type)) {
    return noStoreJson(
      {
        error: 'Only JPEG, PNG, and WebP images are supported for OCR preflight.',
        code: 'UNSUPPORTED_IMAGE_TYPE',
      },
      415
    )
  }
  if (file.size > MAX_PREFLIGHT_IMAGE_BYTES) {
    return noStoreJson(
      {
        error: 'The image is too large for OCR preflight.',
        code: 'IMAGE_TOO_LARGE',
      },
      413
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const imageMetadata = readImageMetadata(bytes)
  if (!imageMetadata) {
    return noStoreJson(
      {
        error: 'The uploaded file does not contain a readable supported image.',
        code: 'INVALID_IMAGE',
      },
      422
    )
  }
  if (imageMetadata.mediaType !== file.type) {
    return noStoreJson(
      {
        error: 'The uploaded file type does not match its image content.',
        code: 'IMAGE_TYPE_MISMATCH',
      },
      422
    )
  }

  const { dimensions } = imageMetadata
  if (dimensions.width * dimensions.height > MAX_PREFLIGHT_IMAGE_PIXELS) {
    return noStoreJson(
      {
        error: 'The image dimensions are too large for OCR preflight.',
        code: 'IMAGE_DIMENSIONS_TOO_LARGE',
      },
      413
    )
  }

  if (!hasMinimumMaayanImageResolution(dimensions)) {
    return noStoreJson(preflightMaayanOcrPage({ ...dimensions, words: [] }))
  }

  try {
    const page = await runOcrPreflight(() =>
      recognizeTesseractImage(bytes, dimensions)
    )
    return noStoreJson(preflightMaayanOcrPage(page))
  } catch (error) {
    if (error instanceof OcrPreflightBusyError) {
      return noStoreJson(
        {
          error: 'OCR preflight is busy with another image. Try again shortly.',
          code: 'OCR_PREFLIGHT_BUSY',
        },
        429
      )
    }
    if (error instanceof OcrPreflightTimeoutError) {
      return noStoreJson(
        {
          error: 'OCR preflight took too long. Enter the rows manually and try again later.',
          code: 'OCR_PREFLIGHT_TIMEOUT',
        },
        504
      )
    }
    if (isOcrImageDecodeError(error)) {
      return noStoreJson(
        {
          error: 'The uploaded file could not be decoded as an image.',
          code: 'INVALID_IMAGE_CONTENT',
        },
        422
      )
    }

    return noStoreJson(
      {
        error: 'OCR preflight is temporarily unavailable. Enter the rows manually and try again later.',
        code: 'OCR_PREFLIGHT_UNAVAILABLE',
      },
      503
    )
  }
}
