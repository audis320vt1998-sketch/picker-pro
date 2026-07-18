/**
 * Values shared by the browser's selection guard and the server-side OCR
 * preflight boundary. The browser check is only an early UX guard; the API
 * repeats every relevant validation before it reads or processes an image.
 */
export const MAX_PREFLIGHT_BATCH_IMAGES = 20
export const MAX_PREFLIGHT_IMAGE_BYTES = 12 * 1024 * 1024
export const MAX_PREFLIGHT_IMAGE_PIXELS = 24_000_000
export const MAX_PREFLIGHT_MULTIPART_BYTES = MAX_PREFLIGHT_IMAGE_BYTES + 1024 * 1024

export const PREFLIGHT_SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type PreflightSupportedImageType =
  (typeof PREFLIGHT_SUPPORTED_IMAGE_TYPES)[number]

export const PREFLIGHT_FILE_INPUT_ACCEPT = PREFLIGHT_SUPPORTED_IMAGE_TYPES.join(',')

export interface PreflightFileMetadata {
  type: string
  size: number
}

export type PreflightFileSelectionIssue =
  | 'UNSUPPORTED_IMAGE_TYPE'
  | 'IMAGE_TOO_LARGE'
  | 'INVALID_IMAGE'

export function isSupportedPreflightImageType(
  value: string
): value is PreflightSupportedImageType {
  return PREFLIGHT_SUPPORTED_IMAGE_TYPES.includes(value as PreflightSupportedImageType)
}

/**
 * This deliberately does not try to decode image bytes in the browser. It
 * gives an early, deterministic hint while the API remains the final source
 * of truth for content, dimensions, and multipart limits.
 */
export function getPreflightFileSelectionIssue(
  file: PreflightFileMetadata
): PreflightFileSelectionIssue | null {
  if (!isSupportedPreflightImageType(file.type)) {
    return 'UNSUPPORTED_IMAGE_TYPE'
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'INVALID_IMAGE'
  }
  if (file.size > MAX_PREFLIGHT_IMAGE_BYTES) {
    return 'IMAGE_TOO_LARGE'
  }

  return null
}
