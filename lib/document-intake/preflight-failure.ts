const OCR_PREFLIGHT_API_FAILURE_CODES = [
  'INVALID_PREFLIGHT_INPUT',
  'REQUEST_TOO_LARGE',
  'UNSUPPORTED_IMAGE_TYPE',
  'IMAGE_TOO_LARGE',
  'INVALID_IMAGE',
  'IMAGE_TYPE_MISMATCH',
  'IMAGE_DIMENSIONS_TOO_LARGE',
  'INVALID_IMAGE_CONTENT',
  'OCR_PREFLIGHT_BUSY',
  'OCR_PREFLIGHT_TIMEOUT',
  'OCR_PREFLIGHT_UNAVAILABLE',
] as const

export type OcrPreflightApiFailureCode =
  (typeof OCR_PREFLIGHT_API_FAILURE_CODES)[number]

/**
 * UNKNOWN intentionally carries no server text. It is used for malformed or
 * unrecognized responses so an untrusted response cannot appear in the review
 * UI.
 */
export type OcrPreflightFailureCode = OcrPreflightApiFailureCode | 'UNKNOWN'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isOcrPreflightApiFailureCode(
  value: unknown
): value is OcrPreflightApiFailureCode {
  return (
    typeof value === 'string' &&
    OCR_PREFLIGHT_API_FAILURE_CODES.includes(value as OcrPreflightApiFailureCode)
  )
}

/**
 * Accept only the documented code field. In particular, never retain an API
 * error message, status text, filename, or response body for later display.
 */
export function preflightFailureCodeFromResponse(
  value: unknown
): OcrPreflightFailureCode {
  if (isRecord(value) && isOcrPreflightApiFailureCode(value.code)) {
    return value.code
  }

  return 'UNKNOWN'
}

/**
 * Retrying is always an explicit user action. Input/content failures require
 * a changed image, while these three codes can plausibly succeed unchanged.
 */
export function isRetryablePreflightFailure(
  code: OcrPreflightFailureCode
): boolean {
  return (
    code === 'OCR_PREFLIGHT_BUSY' ||
    code === 'OCR_PREFLIGHT_TIMEOUT' ||
    code === 'OCR_PREFLIGHT_UNAVAILABLE'
  )
}
