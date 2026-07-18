import {
  isRetryablePreflightFailure,
  preflightFailureCodeFromResponse,
} from '@/lib/document-intake/preflight-failure'

describe('OCR preflight failure boundary', () => {
  it('keeps only a documented failure code from an API response', () => {
    expect(
      preflightFailureCodeFromResponse({
        code: 'IMAGE_TYPE_MISMATCH',
        error: 'source file should never reach the UI',
      })
    ).toBe('IMAGE_TYPE_MISMATCH')
  })

  it('falls back without preserving unknown response text or values', () => {
    expect(
      preflightFailureCodeFromResponse({
        code: 'CUSTOMER_PRIVATE_FAILURE',
        error: 'customer-private-order.jpg',
      })
    ).toBe('UNKNOWN')
    expect(preflightFailureCodeFromResponse(null)).toBe('UNKNOWN')
    expect(preflightFailureCodeFromResponse('network failure')).toBe('UNKNOWN')
  })

  it('allows an explicit retry only for known temporary OCR failures', () => {
    expect(isRetryablePreflightFailure('OCR_PREFLIGHT_BUSY')).toBe(true)
    expect(isRetryablePreflightFailure('OCR_PREFLIGHT_TIMEOUT')).toBe(true)
    expect(isRetryablePreflightFailure('OCR_PREFLIGHT_UNAVAILABLE')).toBe(true)
    expect(isRetryablePreflightFailure('IMAGE_TOO_LARGE')).toBe(false)
    expect(isRetryablePreflightFailure('UNKNOWN')).toBe(false)
  })
})
