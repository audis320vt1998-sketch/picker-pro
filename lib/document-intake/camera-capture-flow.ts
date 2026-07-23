export interface SourceSelectionReplacementCheck {
  selectedImageCount: number
  hasPdfSelection: boolean
  hasPreflightOutcome: boolean
}

export type CameraCaptureReplacementCheck = SourceSelectionReplacementCheck

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
