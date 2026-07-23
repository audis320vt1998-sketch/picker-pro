import {
  loadPickingRuleConfiguration,
  PickingRuleConfigurationError,
} from '@/lib/manual-review/picking-rule-config'

describe('picking-rule configuration', () => {
  it('loads the approved review-only rule shape', () => {
    expect(
      loadPickingRuleConfiguration({
        version: '1.0.0',
        conversionMode: 'reviewSuggestion',
        catalogOverridesSourceMarkers: true,
        caseOnlyFractions: [8, 12, 20, 24],
        individualPickingParentheses: { minimum: 8, maximum: 24 },
      })
    ).toEqual({
      version: '1.0.0',
      conversionMode: 'reviewSuggestion',
      catalogOverridesSourceMarkers: true,
      caseOnlyFractions: [8, 12, 20, 24],
      individualPickingParentheses: { minimum: 8, maximum: 24 },
    })
  })

  it('rejects an automatic conversion mode or duplicate fractions', () => {
    expect(() =>
      loadPickingRuleConfiguration({
        version: '1.0.0',
        conversionMode: 'automatic',
        catalogOverridesSourceMarkers: true,
        caseOnlyFractions: [8],
        individualPickingParentheses: { minimum: 8, maximum: 24 },
      })
    ).toThrow(PickingRuleConfigurationError)

    expect(() =>
      loadPickingRuleConfiguration({
        version: '1.0.0',
        conversionMode: 'reviewSuggestion',
        catalogOverridesSourceMarkers: true,
        caseOnlyFractions: [8, 8],
        individualPickingParentheses: { minimum: 8, maximum: 24 },
      })
    ).toThrow(PickingRuleConfigurationError)
  })
})
