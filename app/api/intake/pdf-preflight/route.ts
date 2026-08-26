import { NextRequest, NextResponse } from 'next/server'
import {
  hasPdfSignature,
  isSupportedPreflightPdfType,
  MAX_PREFLIGHT_PDF_BYTES,
  MAX_PREFLIGHT_PDF_MULTIPART_BYTES,
  preflightPdfRasterPages,
} from '@/lib/document-intake'
import {
  PdfRenderingError,
  renderPdfToPngPages,
} from '@/lib/document-intake/pdf-renderer'
import { recognizeTesseractImage } from '@/lib/document-intake/tesseract-adapter'
import {
  OcrPreflightBusyError,
  OcrPreflightTimeoutError,
  runOcrPreflight,
} from '@/lib/document-intake/ocr-capacity'

export const runtime = 'nodejs'

const PDF_OCR_TIMEOUT_MS = 8 * 60 * 1000

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== 'string' && typeof value.arrayBuffer === 'function'
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

/**
 * Renders a user-selected PDF into temporary local PNG pages and returns
 * review-only OCR drafts. It never persists the source PDF, generated images,
 * product matches, or operational quantities.
 */
export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_PREFLIGHT_PDF_MULTIPART_BYTES
  ) {
    return noStoreJson(
      { error: 'The PDF upload is too large for OCR preflight.', code: 'REQUEST_TOO_LARGE' },
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
        code: 'INVALID_PDF_PREFLIGHT_INPUT',
      },
      400
    )
  }

  const submitted = form.getAll('file')
  if (submitted.length !== 1 || !isUploadedFile(submitted[0])) {
    return noStoreJson(
      {
        error: 'Exactly one PDF file is required.',
        code: 'INVALID_PDF_PREFLIGHT_INPUT',
      },
      400
    )
  }

  const file = submitted[0]
  if (!isSupportedPreflightPdfType(file.type)) {
    return noStoreJson(
      {
        error: 'Only PDF documents are supported for PDF OCR preflight.',
        code: 'UNSUPPORTED_PDF_TYPE',
      },
      415
    )
  }
  if (file.size > MAX_PREFLIGHT_PDF_BYTES) {
    return noStoreJson(
      { error: 'The PDF is too large for OCR preflight.', code: 'PDF_TOO_LARGE' },
      413
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasPdfSignature(bytes)) {
    return noStoreJson(
      { error: 'The uploaded file does not contain a readable PDF.', code: 'INVALID_PDF' },
      422
    )
  }

  try {
    const result = await runOcrPreflight(
      async () =>
        preflightPdfRasterPages(
          await renderPdfToPngPages(bytes),
          recognizeTesseractImage
        ),
      PDF_OCR_TIMEOUT_MS
    )
    return noStoreJson(result)
  } catch (error) {
    if (error instanceof OcrPreflightBusyError) {
      return noStoreJson(
        { error: 'OCR preflight is busy with another document.', code: 'OCR_PREFLIGHT_BUSY' },
        429
      )
    }
    if (error instanceof OcrPreflightTimeoutError) {
      return noStoreJson(
        {
          error: 'PDF OCR preflight took too long. Enter the rows manually and try again later.',
          code: 'OCR_PREFLIGHT_TIMEOUT',
        },
        504
      )
    }
    if (error instanceof PdfRenderingError) {
      const status =
        error.code === 'PDF_TOO_MANY_PAGES'
          ? 413
          : error.code === 'PDF_RENDERER_UNAVAILABLE'
            ? 503
            : 422
      return noStoreJson(
        { error: 'The PDF could not be prepared for OCR preflight.', code: error.code },
        status
      )
    }

    return noStoreJson(
      {
        error: 'PDF OCR preflight is temporarily unavailable. Enter the rows manually and try again later.',
        code: 'OCR_PREFLIGHT_UNAVAILABLE',
      },
      503
    )
  }
}
