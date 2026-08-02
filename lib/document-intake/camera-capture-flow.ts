import { MAX_PREFLIGHT_BATCH_IMAGES } from './preflight-upload-policy'

export interface SourceSelectionReplacementCheck {
  selectedImageCount: number
  hasPdfSelection: boolean
  hasPreflightOutcome: boolean
}

export type CameraCaptureReplacementCheck = SourceSelectionReplacementCheck

export interface CameraCaptureAppendCheck {
  selectedImageCount: number
  hasCameraBatch: boolean
  hasPdfSelection: boolean
  hasPreflightOutcome: boolean
}

/**
 * A new browser-held source (phone capture, existing images, or PDF) can
 * replace an in-memory selection or OCR outcome. Require an explicit
 * confirmation before discarding that work.
 */
export function requiresSourceSelectionReplacementConfirmation({
  selectedImageCount,
  hasPdfSelection,
  hasPreflightOutcome,
}: SourceSelectionReplacementCheck): boolean {
  return (
    (Number.isInteger(selectedImageCount) && selectedImageCount > 0) ||
    hasPdfSelection ||
    hasPreflightOutcome
  )
}

/**
 * Backward-compatible name for the direct-camera flow. Camera captures use
 * the same replacement safeguard as every other source selection.
 */
export function requiresCameraCaptureReplacementConfirmation(
  check: SourceSelectionReplacementCheck
): boolean {
  return requiresSourceSelectionReplacementConfirmation(check)
}

/**
 * A phone capture may be appended only to a local, pre-OCR camera batch.
 * This keeps the next shot from silently replacing a prior page, but it also
 * prevents adding files after results exist or while a PDF/image batch owns
 * the current selection.
 */
export function canAppendCameraCaptureToBatch({
  selectedImageCount,
  hasCameraBatch,
  hasPdfSelection,
  hasPreflightOutcome,
}: CameraCaptureAppendCheck): boolean {
  return (
    hasCameraBatch &&
    Number.isInteger(selectedImageCount) &&
    selectedImageCount > 0 &&
    selectedImageCount < MAX_PREFLIGHT_BATCH_IMAGES &&
    !hasPdfSelection &&
    !hasPreflightOutcome
  )
}

/**
 * Chooses the least surprising scroll behavior when a newly captured page is
 * brought into view for inspection.
 */
export function cameraCaptureInspectionScrollBehavior(
  prefersReducedMotion: boolean
): ScrollBehavior {
  return prefersReducedMotion ? 'auto' : 'smooth'
}
