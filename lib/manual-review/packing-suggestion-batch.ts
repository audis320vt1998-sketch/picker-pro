export type PackingSuggestionBatchCandidateState =
  | 'IDLE'
  | 'LOADING'
  | 'AVAILABLE'
  | 'REVIEW_REQUIRED'
  | 'FAILED'

export interface PackingSuggestionBatchCandidate {
  hasOcrSourceQuantities: boolean
  hasExplicitManualQuantities: boolean
  suggestionState: PackingSuggestionBatchCandidateState
}

interface PackingSuggestionStateLike {
  kind: PackingSuggestionBatchCandidateState
}

/**
 * A manual quantity edit cancels a pending request for that row. Remove only
 * the transient loading state so the row never remains disabled after the
 * response is intentionally ignored.
 */
export function discardLoadingPackingSuggestion<
  State extends PackingSuggestionStateLike,
>(states: Record<number, State>, rowId: number): Record<number, State> {
  if (states[rowId]?.kind !== 'LOADING') {
    return states
  }

  const { [rowId]: _discarded, ...remaining } = states
  return remaining
}

/**
 * Chooses only OCR-backed rows that can safely receive a new packing
 * suggestion. A batch calculation never overwrites a manually entered value
 * and does not repeat a conclusive suggestion already shown to the reviewer.
 */
export function isPackingSuggestionBatchCandidate({
  hasOcrSourceQuantities,
  hasExplicitManualQuantities,
  suggestionState,
}: PackingSuggestionBatchCandidate): boolean {
  return (
    hasOcrSourceQuantities &&
    !hasExplicitManualQuantities &&
    (suggestionState === 'IDLE' || suggestionState === 'FAILED')
  )
}
