import {
  getPdfPreflightFileSelectionIssue,
  hasPdfSignature,
  isSupportedPreflightPdfType,
  MAX_PREFLIGHT_PDF_BYTES,
} from '../../lib/document-intake/pdf-preflight-policy'

describe('PDF preflight policy', () => {
  it('accepts only non-empty PDFs within the configured byte limit', () => {
    expect(
      getPdfPreflightFileSelectionIssue({
        type: 'application/pdf',
        size: MAX_PREFLIGHT_PDF_BYTES,
      })
    ).toBeNull()
    expect(
      getPdfPreflightFileSelectionIssue({
        type: 'application/pdf',
        size: MAX_PREFLIGHT_PDF_BYTES + 1,
      })
    ).toBe('PDF_TOO_LARGE')
    expect(
      getPdfPreflightFileSelectionIssue({ type: 'application/pdf', size: 0 })
    ).toBe('INVALID_PDF_FILE')
  })

  it('requires the standard PDF media type and magic signature', () => {
    expect(isSupportedPreflightPdfType(' application/pdf ')).toBe(true)
    expect(isSupportedPreflightPdfType('image/pdf')).toBe(false)
    expect(hasPdfSignature(Uint8Array.from([37, 80, 68, 70, 45]))).toBe(true)
    expect(hasPdfSignature(Uint8Array.from([137, 80, 78, 71]))).toBe(false)
  })
})
