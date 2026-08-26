export const PDF_PREFLIGHT_MEDIA_TYPE = 'application/pdf'
export const MAX_PREFLIGHT_PDF_BYTES = 25 * 1024 * 1024
export const MAX_PREFLIGHT_PDF_MULTIPART_BYTES =
  MAX_PREFLIGHT_PDF_BYTES + 64 * 1024
export const MAX_PREFLIGHT_PDF_PAGES = 20

export const PDF_PREFLIGHT_FILE_INPUT_ACCEPT = [
  '.pdf',
  PDF_PREFLIGHT_MEDIA_TYPE,
].join(',')

export type PdfPreflightFailureCode =
  | 'INVALID_PDF_PREFLIGHT_INPUT'
  | 'REQUEST_TOO_LARGE'
  | 'UNSUPPORTED_PDF_TYPE'
  | 'PDF_TOO_LARGE'
  | 'INVALID_PDF'
  | 'PDF_TOO_MANY_PAGES'
  | 'PDF_RENDERER_UNAVAILABLE'
  | 'PDF_RENDER_FAILED'
  | 'OCR_PREFLIGHT_BUSY'
  | 'OCR_PREFLIGHT_TIMEOUT'
  | 'OCR_PREFLIGHT_UNAVAILABLE'

export interface PdfPreflightFileMetadata {
  size: number
  type: string
}

export type PdfPreflightFileSelectionIssue =
  | 'UNSUPPORTED_PDF_TYPE'
  | 'PDF_TOO_LARGE'
  | 'INVALID_PDF_FILE'

export function isSupportedPreflightPdfType(value: string): boolean {
  return value.trim().toLowerCase() === PDF_PREFLIGHT_MEDIA_TYPE
}

export function hasPdfSignature(bytes: Uint8Array): boolean {
  const signature = '%PDF-'
  return (
    bytes.length >= signature.length &&
    [...signature].every((character, index) => bytes[index] === character.charCodeAt(0))
  )
}

export function getPdfPreflightFileSelectionIssue(
  file: PdfPreflightFileMetadata
): PdfPreflightFileSelectionIssue | null {
  if (!isSupportedPreflightPdfType(file.type)) {
    return 'UNSUPPORTED_PDF_TYPE'
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'INVALID_PDF_FILE'
  }
  if (file.size > MAX_PREFLIGHT_PDF_BYTES) {
    return 'PDF_TOO_LARGE'
  }

  return null
}
