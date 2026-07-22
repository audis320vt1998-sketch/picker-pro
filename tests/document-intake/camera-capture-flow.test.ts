import { requiresCameraCaptureReplacementConfirmation } from '@/lib/document-intake/camera-capture-flow'

describe('camera capture replacement flow', () => {
  it('allows the first camera capture without a replacement confirmation', () => {
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
    expect(requiresCameraCaptureReplacementConfirmation(state)).toBe(true)
  })
})
