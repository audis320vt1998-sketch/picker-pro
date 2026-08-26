import type {
  AvailablePackingSuggestion,
  PackingSuggestion,
  PackingSuggestionReviewCode,
  PackingSuggestionRule,
  ReviewRequiredPackingSuggestion,
} from './packing-suggestion'

const PACKING_SUGGESTION_REVIEW_CODES = [
  'SOURCE_PRODUCT_NAME_MISSING',
  'SOURCE_MARKER_MISSING',
  'SOURCE_MARKER_AMBIGUOUS',
  'SOURCE_QUANTITIES_INCOMPLETE',
  'SOURCE_QUANTITIES_INCONSISTENT',
  'PRODUCT_UNRESOLVED',
  'PRODUCT_CONFLICT',
  'PRODUCT_UNVERIFIED',
  'CATALOG_PACK_SIZE_MISSING',
  'CATALOG_PACK_SIZE_CONFLICT',
  'CATALOG_PICKING_POLICY_CONFLICT',
] as const

const PACKING_SUGGESTION_RULES = [
  'CASE_ONLY_FRACTION',
  'INDIVIDUAL_PICKING_PARENTHESES',
] as const

const PACKING_SUGGESTION_API_FAILURE_CODES = [
  'INVALID_PACKING_SUGGESTION_INPUT',
  'PACKING_SUGGESTION_UNAVAILABLE',
] as const

export type PackingSuggestionApiFailureCode =
  (typeof PACKING_SUGGESTION_API_FAILURE_CODES)[number]

export type PackingSuggestionFailureCode =
  | PackingSuggestionApiFailureCode
  | 'UNKNOWN'

export type PackingSuggestionResponse = PackingSuggestion & {
  kind: 'PACKING_SUGGESTION'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isRulesVersion(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64
}

function isPackingSuggestionRule(value: unknown): value is PackingSuggestionRule {
  return (
    typeof value === 'string' &&
    PACKING_SUGGESTION_RULES.includes(value as PackingSuggestionRule)
  )
}

function isPackingSuggestionReviewCode(
  value: unknown
): value is PackingSuggestionReviewCode {
  return (
    typeof value === 'string' &&
    PACKING_SUGGESTION_REVIEW_CODES.includes(value as PackingSuggestionReviewCode)
  )
}

function isPackingSuggestionApiFailureCode(
  value: unknown
): value is PackingSuggestionApiFailureCode {
  return (
    typeof value === 'string' &&
    PACKING_SUGGESTION_API_FAILURE_CODES.includes(
      value as PackingSuggestionApiFailureCode
    )
  )
}

function availableSuggestionFromResponse(
  value: Record<string, unknown>
): AvailablePackingSuggestion | null {
  if (
    !isPackingSuggestionRule(value.rule) ||
    !isRulesVersion(value.rulesVersion) ||
    !isPositiveInteger(value.packSize) ||
    !isNonNegativeInteger(value.cases) ||
    !isNonNegativeInteger(value.units)
  ) {
    return null
  }

  return {
    status: 'AVAILABLE',
    rule: value.rule,
    rulesVersion: value.rulesVersion,
    packSize: value.packSize,
    cases: value.cases,
    units: value.units,
  }
}

function reviewSuggestionFromResponse(
  value: Record<string, unknown>
): ReviewRequiredPackingSuggestion | null {
  if (
    !isPackingSuggestionReviewCode(value.code) ||
    !isRulesVersion(value.rulesVersion)
  ) {
    return null
  }

  return {
    status: 'REVIEW_REQUIRED',
    code: value.code,
    rulesVersion: value.rulesVersion,
  }
}

/**
 * Whitelists the compact result shape used by the browser. It intentionally
 * ignores API text fields, product names, and all document-derived strings.
 */
export function packingSuggestionFromResponse(
  value: unknown
): PackingSuggestionResponse | null {
  if (!isRecord(value) || value.kind !== 'PACKING_SUGGESTION') {
    return null
  }

  if (value.status === 'AVAILABLE') {
    const suggestion = availableSuggestionFromResponse(value)
    return suggestion ? { kind: 'PACKING_SUGGESTION', ...suggestion } : null
  }

  if (value.status === 'REVIEW_REQUIRED') {
    const suggestion = reviewSuggestionFromResponse(value)
    return suggestion ? { kind: 'PACKING_SUGGESTION', ...suggestion } : null
  }

  return null
}

/**
 * Keeps the client error copy fixed instead of rendering server-provided text.
 */
export function packingSuggestionFailureCodeFromResponse(
  value: unknown,
  status?: number
): PackingSuggestionFailureCode {
  if (!isRecord(value) || !isPackingSuggestionApiFailureCode(value.code)) {
    return 'UNKNOWN'
  }

  if (
    status !== undefined &&
    ((value.code === 'INVALID_PACKING_SUGGESTION_INPUT' && status !== 400) ||
      (value.code === 'PACKING_SUGGESTION_UNAVAILABLE' && status !== 503))
  ) {
    return 'UNKNOWN'
  }

  return value.code
}
