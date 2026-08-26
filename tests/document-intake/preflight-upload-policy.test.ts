import {
  getPreflightFileSelectionIssue,
  isSupportedPreflightImageType,
  PREFLIGHT_CAMERA_CAPTURE,
  MAX_PREFLIGHT_IMAGE_BYTES,
  PREFLIGHT_FILE_INPUT_ACCEPT,
  PREFLIGHT_SUPPORTED_IMAGE_TYPES,
} from '@/lib/document-intake/preflight-upload-policy'

describe('OCR preflight upload policy', () => {
  it('uses the exact supported media types for the browser and server guards', () => {
    expect(PREFLIGHT_SUPPORTED_IMAGE_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
    ])
    expect(PREFLIGHT_FILE_INPUT_ACCEPT).toBe('image/jpeg,image/png,image/webp')
    expect(PREFLIGHT_CAMERA_CAPTURE).toBe('environment')
    expect(isSupportedPreflightImageType('image/jpeg')).toBe(true)
    expect(isSupportedPreflightImageType('image/JPEG')).toBe(false)
  })

  it('accepts an image exactly at the byte limit and rejects larger or empty files', () => {
    expect(
      getPreflightFileSelectionIssue({
        type: 'image/png',
        size: MAX_PREFLIGHT_IMAGE_BYTES,
      })
    ).toBeNull()
    expect(
      getPreflightFileSelectionIssue({
        type: 'image/png',
        size: MAX_PREFLIGHT_IMAGE_BYTES + 1,
      })
    ).toBe('IMAGE_TOO_LARGE')
    expect(
      getPreflightFileSelectionIssue({ type: 'image/jpeg', size: 0 })
    ).toBe('INVALID_IMAGE')
  })

  it('rejects unsupported declared types before the browser starts an upload', () => {
    expect(
      getPreflightFileSelectionIssue({ type: 'application/pdf', size: 1024 })
    ).toBe('UNSUPPORTED_IMAGE_TYPE')
  })
})
