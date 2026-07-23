import {
  requiresCameraCaptureReplacementConfirmation,
  requiresSourceSelectionReplacementConfirmation,
} from '@/lib/document-intake/camera-capture-flow'

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
})
