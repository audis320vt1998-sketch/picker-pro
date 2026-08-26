import { NextRequest, NextResponse } from 'next/server'
import {
  getCatalogOnboardingFileSelectionIssue,
  MAX_CATALOG_ONBOARDING_MULTIPART_BYTES,
  preflightCatalogOnboardingCsv,
  type CatalogOnboardingPreflightFailureCode,
} from '@/lib/catalog'

export const runtime = 'nodejs'

function isUploadedFile(value: FormDataEntryValue): value is File {
  return typeof value !== 'string' && typeof value.arrayBuffer === 'function'
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function failure(code: CatalogOnboardingPreflightFailureCode, status: number) {
  return noStoreJson(
    {
      kind: 'CATALOG_ONBOARDING_PREFLIGHT_FAILURE',
      code,
    },
    status
  )
}

/**
 * Reads one CSV only for the life of this request. The result deliberately
 * contains fixed issue codes and row/field locations, never a filename or
 * raw catalog cells. It does not import, merge, persist, or verify products.
 */
export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get('content-length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_CATALOG_ONBOARDING_MULTIPART_BYTES
  ) {
    return failure('REQUEST_TOO_LARGE', 413)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return failure('INVALID_CATALOG_PREFLIGHT_INPUT', 400)
  }

  const submitted = form.getAll('file')
  const containsUnexpectedField = [...form.keys()].some((key) => key !== 'file')
  if (
    containsUnexpectedField ||
    submitted.length !== 1 ||
    !isUploadedFile(submitted[0])
  ) {
    return failure('INVALID_CATALOG_PREFLIGHT_INPUT', 400)
  }

  const file = submitted[0]
  const selectionIssue = getCatalogOnboardingFileSelectionIssue(file)
  if (selectionIssue === 'UNSUPPORTED_CSV_TYPE') {
    return failure('UNSUPPORTED_CSV_TYPE', 415)
  }
  if (selectionIssue === 'CSV_TOO_LARGE') {
    return failure('CSV_TOO_LARGE', 413)
  }
  if (selectionIssue) {
    return failure('INVALID_CSV_CONTENT', 422)
  }

  let source: string
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return failure('INVALID_CSV_CONTENT', 422)
  }

  return noStoreJson(preflightCatalogOnboardingCsv(source))
}
