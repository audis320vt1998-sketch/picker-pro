import {
  discardLoadingPackingSuggestion,
  isPackingSuggestionBatchCandidate,
} from '@/lib/manual-review/packing-suggestion-batch'

describe('packing suggestion batch candidates', () => {
  it.each(['IDLE', 'FAILED'] as const)(
    'includes an OCR-backed row with empty manual quantities in %s state',
    (suggestionState) => {
      expect(
        isPackingSuggestionBatchCandidate({
          hasOcrSourceQuantities: true,
          hasExplicitManualQuantities: false,
          suggestionState,
        })
      ).toBe(true)
    }
  )

  it.each([
    {
      hasOcrSourceQuantities: false,
      hasExplicitManualQuantities: false,
      suggestionState: 'IDLE',
    },
    {
      hasOcrSourceQuantities: true,
      hasExplicitManualQuantities: true,
      suggestionState: 'IDLE',
    },
    {
      hasOcrSourceQuantities: true,
      hasExplicitManualQuantities: false,
      suggestionState: 'LOADING',
    },
    {
      hasOcrSourceQuantities: true,
      hasExplicitManualQuantities: false,
      suggestionState: 'AVAILABLE',
    },
    {
      hasOcrSourceQuantities: true,
      hasExplicitManualQuantities: false,
      suggestionState: 'REVIEW_REQUIRED',
    },
  ] as const)('excludes an unsafe or already-conclusive row: %o', (candidate) => {
    expect(isPackingSuggestionBatchCandidate(candidate)).toBe(false)
  })

  it('clears only a pending suggestion when a manual quantity edit cancels it', () => {
    const states = {
      1: { kind: 'LOADING' as const },
      2: { kind: 'AVAILABLE' as const },
    }

    expect(discardLoadingPackingSuggestion(states, 1)).toEqual({
      2: { kind: 'AVAILABLE' },
    })
    expect(discardLoadingPackingSuggestion(states, 2)).toBe(states)
  })
})
