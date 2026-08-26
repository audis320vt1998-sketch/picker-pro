import pickingRulesDocument from '@/catalogs/picking-rules.json'

export type PackingSuggestionConversionMode = 'reviewSuggestion'

export interface PickingRuleConfiguration {
  version: string
  conversionMode: PackingSuggestionConversionMode
  catalogOverridesSourceMarkers: true
  caseOnlyFractions: readonly number[]
  individualPickingParentheses: {
    minimum: number
    maximum: number
  }
}

export class PickingRuleConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PickingRuleConfigurationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function readVersion(value: Record<string, unknown>): string {
  if (typeof value.version !== 'string' || value.version.trim().length === 0) {
    throw new PickingRuleConfigurationError('picking rules version must be a non-empty string.')
  }

  return value.version
}

function readCaseOnlyFractions(value: Record<string, unknown>): readonly number[] {
  if (
    !Array.isArray(value.caseOnlyFractions) ||
    value.caseOnlyFractions.length === 0 ||
    !value.caseOnlyFractions.every(isPositiveInteger)
  ) {
    throw new PickingRuleConfigurationError(
      'caseOnlyFractions must be a non-empty array of positive integers.'
    )
  }

  const uniqueFractions = [...new Set(value.caseOnlyFractions)]
  if (uniqueFractions.length !== value.caseOnlyFractions.length) {
    throw new PickingRuleConfigurationError('caseOnlyFractions must not contain duplicates.')
  }

  return uniqueFractions
}

function readParenthesesRange(value: Record<string, unknown>): {
  minimum: number
  maximum: number
} {
  if (!isRecord(value.individualPickingParentheses)) {
    throw new PickingRuleConfigurationError(
      'individualPickingParentheses must be an object.'
    )
  }

  const { minimum, maximum } = value.individualPickingParentheses
  if (!isPositiveInteger(minimum) || !isPositiveInteger(maximum) || minimum > maximum) {
    throw new PickingRuleConfigurationError(
      'individualPickingParentheses must contain a valid positive integer range.'
    )
  }

  return { minimum, maximum }
}

/**
 * Loads the active, versioned rules used only to create a review suggestion.
 * The rules do not change a row or create an operational picking result by
 * themselves; the verified product catalog remains authoritative.
 */
export function loadPickingRuleConfiguration(
  document: unknown = pickingRulesDocument
): PickingRuleConfiguration {
  if (!isRecord(document)) {
    throw new PickingRuleConfigurationError('picking rules must be an object.')
  }

  if (document.conversionMode !== 'reviewSuggestion') {
    throw new PickingRuleConfigurationError(
      'conversionMode must be reviewSuggestion.'
    )
  }

  if (document.catalogOverridesSourceMarkers !== true) {
    throw new PickingRuleConfigurationError(
      'catalogOverridesSourceMarkers must be true.'
    )
  }

  return {
    version: readVersion(document),
    conversionMode: 'reviewSuggestion',
    catalogOverridesSourceMarkers: true,
    caseOnlyFractions: readCaseOnlyFractions(document),
    individualPickingParentheses: readParenthesesRange(document),
  }
}
