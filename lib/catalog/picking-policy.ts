import type { VerifiedCatalogProduct } from './verified-catalog'

export type CatalogPickingMode = 'CASES_ONLY' | 'CASES_AND_UNITS'

/**
 * The catalog is the single operational authority for whether individual
 * units may be picked. This function deliberately does not inspect a source
 * quantity or calculate a pack conversion.
 */
export function catalogPickingMode(
  product: Pick<VerifiedCatalogProduct, 'allowUnitPicking' | 'caseOnly'>
): CatalogPickingMode {
  return product.allowUnitPicking && !product.caseOnly
    ? 'CASES_AND_UNITS'
    : 'CASES_ONLY'
}

export function allowsIndividualUnitPicking(
  product: Pick<VerifiedCatalogProduct, 'allowUnitPicking' | 'caseOnly'>
): boolean {
  return catalogPickingMode(product) === 'CASES_AND_UNITS'
}

/**
 * A case-only product cannot also advertise individual-unit picking. Reject
 * this catalog configuration instead of choosing one flag at runtime.
 */
export function hasConsistentPickingConfiguration(
  product: Pick<VerifiedCatalogProduct, 'allowUnitPicking' | 'caseOnly'>
): boolean {
  return !(product.caseOnly && product.allowUnitPicking)
}
