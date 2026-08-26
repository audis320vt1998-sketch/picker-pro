import {
  canAppendCameraCaptureToBatch,
  cameraCaptureInspectionScrollBehavior,
  getNextCameraCapturePreviewPageNumber,
  requiresCameraCaptureReplacementConfirmation,
  requiresSourceSelectionReplacementConfirmation,
} from '@/lib/document-intake/camera-capture-flow'
import { MAX_PREFLIGHT_BATCH_IMAGES } from '@/lib/document-intake/preflight-upload-policy'

describe('source selection replacement flow', () => {
  it('allows the first source selection without a replacement confirmation', () => {
    expect(
      requiresCameraCaptureReplacementConfirmation({
        selectedImageCount: 0,
        hasPdfSelection: false,
        hasPreflightOutcome: false,
      })
    ).toBe(false)
  })

  it.each([
    {
      selectedImageCount: 1,
      hasPdfSelection: false,
      hasPreflightOutcome: false,
    },
    {
      selectedImageCount: 0,
      hasPdfSelection: true,
      hasPreflightOutcome: false,
    },
    {
      selectedImageCount: 0,
      hasPdfSelection: false,
      hasPreflightOutcome: true,
    },
  ])('requires confirmation before replacing existing browser-held work', (state) => {
    expect(requiresSourceSelectionReplacementConfirmation(state)).toBe(true)
  })

  it('keeps the camera helper aligned with the generic source safeguard', () => {
    const state = {
      selectedImageCount: 0,
      hasPdfSelection: true,
      hasPreflightOutcome: false,
    }

    expect(requiresCameraCaptureReplacementConfirmation(state)).toBe(
      requiresSourceSelectionReplacementConfirmation(state)
    )
  })

  it('allows a new phone capture only in a local pre-OCR camera batch', () => {
    expect(
      canAppendCameraCaptureToBatch({
        selectedImageCount: 1,
        hasCameraBatch: true,
        hasPdfSelection: false,
        hasPreflightOutcome: false,
      })
    ).toBe(true)

    expect(
      canAppendCameraCaptureToBatch({
        selectedImageCount: MAX_PREFLIGHT_BATCH_IMAGES,
        hasCameraBatch: true,
        hasPdfSelection: false,
        hasPreflightOutcome: false,
      })
    ).toBe(false)
  })

  it('requires an explicit replacement decision when a full camera batch cannot append', () => {
    const fullBatch = {
      selectedImageCount: MAX_PREFLIGHT_BATCH_IMAGES,
      hasPdfSelection: false,
      hasPreflightOutcome: false,
    }

    expect(
      canAppendCameraCaptureToBatch({
        ...fullBatch,
        hasCameraBatch: true,
      })
    ).toBe(false)
    expect(requiresSourceSelectionReplacementConfirmation(fullBatch)).toBe(true)
  })

  it.each([
    {
      selectedImageCount: 0,
      hasCameraBatch: true,
      hasPdfSelection: false,
      hasPreflightOutcome: false,
    },
    {
      selectedImageCount: 1,
      hasCameraBatch: false,
      hasPdfSelection: false,
      hasPreflightOutcome: false,
    },
    {
      selectedImageCount: 1,
      hasCameraBatch: true,
      hasPdfSelection: true,
      hasPreflightOutcome: false,
    },
    {
      selectedImageCount: 1,
      hasCameraBatch: true,
      hasPdfSelection: false,
      hasPreflightOutcome: true,
    },
  ])('does not append a capture when the batch is unsafe: %o', (state) => {
    expect(canAppendCameraCaptureToBatch(state)).toBe(false)
  })
})

describe('camera capture inspection flow', () => {
  it('assigns an auto-preview only to a valid next camera page', () => {
    expect(getNextCameraCapturePreviewPageNumber(0)).toBe(1)
    expect(getNextCameraCapturePreviewPageNumber(3)).toBe(4)
    expect(getNextCameraCapturePreviewPageNumber(MAX_PREFLIGHT_BATCH_IMAGES)).toBeNull()
    expect(getNextCameraCapturePreviewPageNumber(-1)).toBeNull()
    expect(getNextCameraCapturePreviewPageNumber(1.5)).toBeNull()
  })

  it('avoids animated scrolling when reduced motion is requested', () => {
    expect(cameraCaptureInspectionScrollBehavior(false)).toBe('smooth')
    expect(cameraCaptureInspectionScrollBehavior(true)).toBe('auto')
  })
})
