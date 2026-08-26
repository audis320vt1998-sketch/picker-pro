import {
  getManualReviewCatalogReadinessState,
} from '@/lib/manual-review/catalog-readiness'

describe('manual-review catalog readiness presentation', () => {
  it('blocks operational expectations when no product is verified', () => {
    expect(
      getManualReviewCatalogReadinessState({
        version: 'test',
        totalProducts: 4,
        verifiedProducts: 0,
        unverifiedProducts: 4,
      })
    ).toBe('NO_VERIFIED_PRODUCTS')
  })

  it('keeps a partially verified catalog distinct from a fully verified one', () => {
    expect(
      getManualReviewCatalogReadinessState({
        version: 'test',
        totalProducts: 4,
        verifiedProducts: 2,
        unverifiedProducts: 2,
      })
    ).toBe('PARTIALLY_VERIFIED_PRODUCTS')

    expect(
      getManualReviewCatalogReadinessState({
        version: 'test',
        totalProducts: 4,
        verifiedProducts: 4,
        unverifiedProducts: 0,
      })
    ).toBe('ALL_PRODUCTS_VERIFIED')
  })
})
