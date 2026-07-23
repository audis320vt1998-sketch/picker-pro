import {
  assessLocalCameraCaptureReadiness,
  type ImageMetadata,
} from '@/lib/document-intake'

function metadata(
  mediaType: ImageMetadata['mediaType'],
  width: number,
  height: number
): ImageMetadata {
  return { mediaType, dimensions: { width, height } }
}

describe('local camera capture readiness', () => {
  it('accepts the exact minimum dimensions used by OCR preflight', () => {
    expect(
      assessLocalCameraCaptureReadiness({
        declaredMediaType: 'image/jpeg',
        metadata: metadata('image/jpeg', 1200, 1600),
      })
    ).toEqual({ kind: 'READY', width: 1200, height: 1600 })
  })

  it.each([
    { width: 1199, height: 1600 },
    { width: 1200, height: 1599 },
  ])('advises a recapture below the minimum dimensions', ({ width, height }) => {
    expect(
      assessLocalCameraCaptureReadiness({
        declaredMediaType: 'image/jpeg',
        metadata: metadata('image/jpeg', width, height),
      })
    ).toEqual({ kind: 'LOW_RESOLUTION', width, height })
  })

  it('advises a smaller capture above the server pixel limit', () => {
    expect(
      assessLocalCameraCaptureReadiness({
        declaredMediaType: 'image/jpeg',
        metadata: metadata('image/jpeg', 6000, 4001),
      })
    ).toEqual({ kind: 'TOO_MANY_PIXELS', width: 6000, height: 4001 })
  })

  it('reports an unreadable local image without inventing dimensions', () => {
    expect(
      assessLocalCameraCaptureReadiness({
        declaredMediaType: 'image/jpeg',
        metadata: null,
      })
    ).toEqual({ kind: 'UNREADABLE' })
  })

  it('prioritizes a detected type mismatch over the size advisory', () => {
    expect(
      assessLocalCameraCaptureReadiness({
        declaredMediaType: 'image/jpeg',
        metadata: metadata('image/png', 640, 480),
      })
    ).toEqual({ kind: 'TYPE_MISMATCH', width: 640, height: 480 })
  })
})
