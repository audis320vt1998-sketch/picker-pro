import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import {
  findDuplicateSourceRows,
  reviewManualRows,
  type ManualReviewRequest,
  type ManualReviewRowInput,
} from '@/lib/manual-review'

interface RequestValidationError {
  row?: number
  field?: string
  code?: 'DUPLICATE_SOURCE_ROW'
  duplicateOfRow?: number
  message: string
}

/**
 * Document identity is deliberately limited to a random, lowercase UUID v4
 * with a fixed prefix. This prevents callers from putting a filename, a
 * customer identifier, or any other readable document metadata in the value.
 */
const OPAQUE_SOURCE_DOCUMENT_REF =
  /^doc_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optionalString(
  value: Record<string, unknown>,
  field: string,
  errors: RequestValidationError[],
  row: number
): string | undefined {
  const candidate = value[field]
  if (candidate === undefined) {
    return undefined
  }

  if (typeof candidate !== 'string') {
    errors.push({ row, field, message: 'Must be a string when provided.' })
    return undefined
  }

  return candidate
}

function optionalSourceDocumentRef(
  value: Record<string, unknown>,
  errors: RequestValidationError[],
  row: number
): string | undefined {
  const candidate = value.sourceDocumentRef
  if (candidate === undefined) {
    return undefined
  }

  if (typeof candidate !== 'string' || !OPAQUE_SOURCE_DOCUMENT_REF.test(candidate)) {
    errors.push({
      row,
      field: 'sourceDocumentRef',
      message:
        'Must be an opaque lowercase UUID v4 in the form doc_<uuid>; do not use filenames or customer identifiers.',
    })
    return undefined
  }

  return candidate
}

function positiveInteger(
  value: Record<string, unknown>,
  field: string,
  errors: RequestValidationError[],
  row: number
): number | undefined {
  const candidate = value[field]
  if (typeof candidate !== 'number' || !Number.isInteger(candidate) || candidate < 1) {
    errors.push({ row, field, message: 'Must be a positive integer.' })
    return undefined
  }

  return candidate
}

function nonNegativeNumber(
  value: Record<string, unknown>,
  field: string,
  errors: RequestValidationError[],
  row: number
): number | undefined {
  const candidate = value[field]
  if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate < 0) {
    errors.push({ row, field, message: 'Must be a non-negative finite number.' })
    return undefined
  }

  return candidate
}

function requiredRawText(
  value: Record<string, unknown>,
  errors: RequestValidationError[],
  row: number
): string | undefined {
  const rawText = value.rawText
  if (typeof rawText !== 'string') {
    errors.push({ row, field: 'rawText', message: 'Must be a string.' })
    return undefined
  }

  return rawText
}

function parseRow(
  value: unknown,
  index: number,
  errors: RequestValidationError[]
): ManualReviewRowInput | undefined {
  const row = index + 1
  if (!isRecord(value)) {
    errors.push({ row, message: 'Each row must be an object.' })
    return undefined
  }

  const sourceDocumentRef = optionalSourceDocumentRef(value, errors, row)
  const sourceFileName = optionalString(value, 'sourceFileName', errors, row)
  const productName = optionalString(value, 'productName', errors, row)
  const barcode = optionalString(value, 'barcode', errors, row)
  const sku = optionalString(value, 'sku', errors, row)
  const pageNumber = positiveInteger(value, 'pageNumber', errors, row)
  const rowNumber = positiveInteger(value, 'rowNumber', errors, row)
  const rawText = requiredRawText(value, errors, row)
  const cases = nonNegativeNumber(value, 'cases', errors, row)
  const units = nonNegativeNumber(value, 'units', errors, row)

  if (
    !productName?.trim() &&
    !barcode?.trim() &&
    !sku?.trim()
  ) {
    errors.push({
      row,
      message: 'At least one of productName, barcode, or sku is required.',
    })
  }

  if (
    pageNumber === undefined ||
    rowNumber === undefined ||
    rawText === undefined ||
    cases === undefined ||
    units === undefined
  ) {
    return undefined
  }

  return {
    ...(sourceDocumentRef ? { sourceDocumentRef } : {}),
    ...(sourceFileName ? { sourceFileName } : {}),
    pageNumber,
    rowNumber,
    rawText,
    ...(productName ? { productName } : {}),
    ...(barcode ? { barcode } : {}),
    ...(sku ? { sku } : {}),
    cases,
    units,
  }
}

function validateDistinctSourceRows(
  rows: readonly ManualReviewRowInput[],
  errors: RequestValidationError[]
): void {
  for (const duplicate of findDuplicateSourceRows(rows)) {
    errors.push({
      row: duplicate.duplicateInputIndex + 1,
      field: 'sourceDocumentRef',
      code: 'DUPLICATE_SOURCE_ROW',
      duplicateOfRow: duplicate.firstInputIndex + 1,
      message:
        'This sourceDocumentRef, pageNumber, and rowNumber combination is already included in the request.',
    })
  }
}

function parseRequest(value: unknown): {
  request?: ManualReviewRequest
  errors: RequestValidationError[]
} {
  const errors: RequestValidationError[] = []
  if (!isRecord(value) || !Array.isArray(value.rows) || value.rows.length === 0) {
    return {
      errors: [
        {
          field: 'rows',
          message: 'rows must be a non-empty array.',
        },
      ],
    }
  }

  const rows = value.rows
    .map((row, index) => parseRow(row, index, errors))
    .filter((row): row is ManualReviewRowInput => row !== undefined)

  if (errors.length === 0) {
    validateDistinctSourceRows(rows, errors)
  }

  return errors.length > 0 ? { errors } : { request: { rows }, errors }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: 'Request body must be valid JSON.',
        code: 'INVALID_MANUAL_REVIEW_INPUT',
      },
      { status: 400 }
    )
  }

  const parsed = parseRequest(body)
  if (!parsed.request) {
    return NextResponse.json(
      {
        error: 'Manual review input is invalid.',
        code: 'INVALID_MANUAL_REVIEW_INPUT',
        details: parsed.errors,
      },
      { status: 400 }
    )
  }

  try {
    const result = reviewManualRows(
      parsed.request,
      `manual-review-${randomUUID()}`
    )

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json(
      {
        error: 'The verified product catalog is unavailable.',
        code: 'CATALOG_UNAVAILABLE',
      },
      { status: 503 }
    )
  }
}
