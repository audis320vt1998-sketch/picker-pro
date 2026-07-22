export interface CameraCaptureReplacementCheck {
  selectedImageCount: number
  hasPdfSelection: boolean
  hasPreflightOutcome: boolean
}

/**
 * A new phone capture always represents one new logical document page. When
 * the browser already holds a selection or OCR outcome, require an explicit
 * confirmation before discarding that in-memory work.
 */
export function requiresCameraCaptureReplacementConfirmation({
  selectedImageCount,
  hasPdfSelection,
  hasPreflightOutcome,
}: CameraCaptureReplacementCheck): boolean {
  return (
    (Number.isInteger(selectedImageCount) && selectedImageCount > 0) ||
    hasPdfSelection ||
    hasPreflightOutcome
  )
}
