export type DomainErrorCode =
  | 'CONFIG_INVALID'
  | 'OCR_IMAGE_ERROR'
  | 'PDF_RENDER_ERROR'
  | 'PARSE_FAILED'
  | 'PRODUCT_NOT_FOUND'
  | 'CITY_UNRESOLVED'
  | 'ROUTE_UNRESOLVED'
  | 'VALIDATION_FAILED'
  | 'TRACEABILITY_MISSING'
  | 'INTERNAL_ERROR'

export interface DomainError extends Error {
  readonly code: DomainErrorCode
  readonly details?: Record<string, unknown>
}

export class PickerProError extends Error implements DomainError {
  readonly code: DomainErrorCode
  readonly details?: Record<string, unknown>

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PickerProError'
    this.code = code
    this.details = details
  }
}

export function createDomainError(
  code: DomainErrorCode,
  message: string,
  details?: Record<string, unknown>
): DomainError {
  return new PickerProError(code, message, details)
}

export function isDomainError(error: unknown): error is DomainError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  )
}
