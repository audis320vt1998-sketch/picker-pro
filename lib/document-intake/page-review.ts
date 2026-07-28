import { isMaayanHeaderRouteCode } from './maayan-header-route'

/**
 * A page confirmation is browser-only evidence that the reviewer has checked
 * the currently selected OCR rows and the route code against that page. It is
 * deliberately small: no image, filename, header text, or OCR trace is kept.
 */
export interface OcrPreflightPageReviewConfirmation {
  routeCode: string
  selectedRowKeys: readonly string[]
}

export interface OcrPreflightPageReviewInput {
  routeCode: string
  selectedRowKeys: readonly string[]
  confirmation?: OcrPreflightPageReviewConfirmation
}

export type OcrPreflightPageReviewState =
  | { kind: 'ROWS_REQUIRED'; selectedRowCount: 0 }
  | { kind: 'ROUTE_REQUIRED'; selectedRowCount: number }
  | { kind: 'PENDING'; routeCode: string; selectedRowCount: number }
  | { kind: 'CONFIRMED'; routeCode: string; selectedRowCount: number }

function normalizedRowKeys(keys: readonly string[]): readonly string[] {
  return [...new Set(keys.filter((key) => key.length > 0))].sort()
}

function sameRowKeys(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = normalizedRowKeys(left)
  const normalizedRight = normalizedRowKeys(right)

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((key, index) => key === normalizedRight[index])
  )
}

/**
 * A suggestion from OCR is intentionally not a confirmation. A confirmation
 * remains valid only while both the selected source rows and the short 1–99
 * route code are exactly the same as when the reviewer pressed confirm.
 */
export function getOcrPreflightPageReviewState(
  input: OcrPreflightPageReviewInput
): OcrPreflightPageReviewState {
  const selectedRowKeys = normalizedRowKeys(input.selectedRowKeys)
  if (selectedRowKeys.length === 0) {
    return { kind: 'ROWS_REQUIRED', selectedRowCount: 0 }
  }

  if (!isMaayanHeaderRouteCode(input.routeCode)) {
    return { kind: 'ROUTE_REQUIRED', selectedRowCount: selectedRowKeys.length }
  }

  if (
    !input.confirmation ||
    input.confirmation.routeCode !== input.routeCode ||
    !sameRowKeys(input.confirmation.selectedRowKeys, selectedRowKeys)
  ) {
    return {
      kind: 'PENDING',
      routeCode: input.routeCode,
      selectedRowCount: selectedRowKeys.length,
    }
  }

  return {
    kind: 'CONFIRMED',
    routeCode: input.routeCode,
    selectedRowCount: selectedRowKeys.length,
  }
}

/**
 * Creates an immutable browser-only confirmation. Invalid or empty page
 * review input intentionally has no confirmation and therefore cannot enter
 * the OCR-to-manual-review handoff.
 */
export function createOcrPreflightPageReviewConfirmation(
  input: Pick<OcrPreflightPageReviewInput, 'routeCode' | 'selectedRowKeys'>
): OcrPreflightPageReviewConfirmation | null {
  const state = getOcrPreflightPageReviewState(input)
  if (state.kind !== 'PENDING') {
    return null
  }

  return {
    routeCode: state.routeCode,
    selectedRowKeys: normalizedRowKeys(input.selectedRowKeys),
  }
}
