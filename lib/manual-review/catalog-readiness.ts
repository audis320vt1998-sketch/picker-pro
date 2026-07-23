import type { VerifiedCatalogReadiness } from '@/lib/catalog'

export type ManualReviewCatalogReadinessState =
  | 'NO_VERIFIED_PRODUCTS'
  | 'PARTIALLY_VERIFIED_PRODUCTS'
  | 'ALL_PRODUCTS_VERIFIED'

/**
 * A browser-safe presentation state derived from the server-loaded catalog
 * summary. It deliberately carries no product records or identifiers.
 */
export function getManualReviewCatalogReadinessState(
  readiness: VerifiedCatalogReadiness
): ManualReviewCatalogReadinessState {
  if (readiness.verifiedProducts === 0) {
    return 'NO_VERIFIED_PRODUCTS'
  }

  if (readiness.verifiedProducts < readiness.totalProducts) {
    return 'PARTIALLY_VERIFIED_PRODUCTS'
  }

  return 'ALL_PRODUCTS_VERIFIED'
}
