import {
  allowsIndividualUnitPicking,
  catalogPickingMode,
  hasConsistentPickingConfiguration,
} from '../../lib/catalog/picking-policy'

describe('catalog picking policy', () => {
  it('permits individual units only when both catalog flags allow it', () => {
    const unitProduct = { allowUnitPicking: true, caseOnly: false }
    const caseProduct = { allowUnitPicking: false, caseOnly: true }

    expect(catalogPickingMode(unitProduct)).toBe('CASES_AND_UNITS')
    expect(allowsIndividualUnitPicking(unitProduct)).toBe(true)
    expect(catalogPickingMode(caseProduct)).toBe('CASES_ONLY')
    expect(allowsIndividualUnitPicking(caseProduct)).toBe(false)
  })

  it('flags a catalog record that claims both case-only and unit picking', () => {
    expect(
      hasConsistentPickingConfiguration({
        allowUnitPicking: true,
        caseOnly: true,
      })
    ).toBe(false)
  })
})
