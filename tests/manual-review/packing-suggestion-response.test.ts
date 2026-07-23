import {
  packingSuggestionFailureCodeFromResponse,
  packingSuggestionFromResponse,
} from '@/lib/manual-review/packing-suggestion-response'

describe('packing suggestion response parsing', () => {
  it('keeps only the expected numeric suggestion fields', () => {
    expect(
      packingSuggestionFromResponse({
        kind: 'PACKING_SUGGESTION',
        status: 'AVAILABLE',
        rule: 'INDIVIDUAL_PICKING_PARENTHESES',
        rulesVersion: '1.0.0',
        packSize: 12,
        cases: 2,
        units: 1,
        productName: 'private-source-name',
      })
    ).toEqual({
      kind: 'PACKING_SUGGESTION',
      status: 'AVAILABLE',
      rule: 'INDIVIDUAL_PICKING_PARENTHESES',
      rulesVersion: '1.0.0',
      packSize: 12,
      cases: 2,
      units: 1,
    })
  })

  it('accepts only known fixed review and failure codes', () => {
    expect(
      packingSuggestionFromResponse({
        kind: 'PACKING_SUGGESTION',
        status: 'REVIEW_REQUIRED',
        code: 'CATALOG_PACK_SIZE_CONFLICT',
        rulesVersion: '1.0.0',
      })
    ).toMatchObject({ status: 'REVIEW_REQUIRED' })
    expect(
      packingSuggestionFromResponse({
        kind: 'PACKING_SUGGESTION',
        status: 'REVIEW_REQUIRED',
        code: 'server-message',
        rulesVersion: '1.0.0',
      })
    ).toBeNull()
    expect(
      packingSuggestionFailureCodeFromResponse(
        { code: 'PACKING_SUGGESTION_UNAVAILABLE' },
        503
      )
    ).toBe('PACKING_SUGGESTION_UNAVAILABLE')
    expect(
      packingSuggestionFailureCodeFromResponse(
        { code: 'unknown' },
        503
      )
    ).toBe('UNKNOWN')
  })
})
