import { hasMinimumMaayanImageResolution } from './maayan-layout'
import type { ImageMetadata } from './image-metadata'
import { MAX_PREFLIGHT_IMAGE_PIXELS } from './preflight-upload-policy'

/**
 * A local, advisory-only result shown after a direct camera capture. It uses
 * the same image metadata and minimum dimensions as the server-side OCR
 * preflight, but never replaces the server's validation or inspects OCR text.
 */
export type LocalCameraCaptureReadiness =
  | { kind: 'READY'; width: number; height: number }
  | { kind: 'LOW_RESOLUTION'; width: number; height: number }
  | { kind: 'TOO_MANY_PIXELS'; width: number; height: number }
  | { kind: 'UNREADABLE' }
  | { kind: 'TYPE_MISMATCH'; width: number; height: number }

export function assessLocalCameraCaptureReadiness({
  declaredMediaType,
  metadata,
}: {
  declaredMediaType: string
  metadata: ImageMetadata | null
}): LocalCameraCaptureReadiness {
  if (!metadata) {
    return { kind: 'UNREADABLE' }
  }

  const { width, height } = metadata.dimensions
  if (metadata.mediaType !== declaredMediaType) {
    return { kind: 'TYPE_MISMATCH', width, height }
  }

  if (width * height > MAX_PREFLIGHT_IMAGE_PIXELS) {
    return { kind: 'TOO_MANY_PIXELS', width, height }
  }

  if (!hasMinimumMaayanImageResolution(metadata.dimensions)) {
    return { kind: 'LOW_RESOLUTION', width, height }
  }

  return { kind: 'READY', width, height }
}
