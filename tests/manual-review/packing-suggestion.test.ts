import {
  VerifiedProductCatalog,
  type VerifiedCatalogProduct,
} from '@/lib/catalog/verified-catalog'
import { getPackingSuggestion } from '@/lib/manual-review/packing-suggestion'
import type { PickingRuleConfiguration } from '@/lib/manual-review/picking-rule-config'

const configuration: PickingRuleConfiguration = {
  version: '1.0.0',
  conversionMode: 'reviewSuggestion',
  catalogOverridesSourceMarkers: true,
  caseOnlyFractions: [8, 12, 20, 24],
  individualPickingParentheses: { minimum: 8, maximum: 24 },
}

const individuallyPickedProduct: VerifiedCatalogProduct = {
  productKey: 'individual-12',
  barcode: '1111111111111',
  sku: 'I-12',
  verificationStatus: 'verified',
  name: 'מוצר בודדים',
  aliases: [],
  allowUnitPicking: true,
  caseOnly: false,
  unitSize: 1,
  caseSize: 12,
  active: true,
}

const caseOnlyProduct: VerifiedCatalogProduct = {
  productKey: 'case-12',
  barcode: '2222222222222',
  sku: 'C-12',
  verificationStatus: 'verified',
  name: 'מוצר מארז',
  aliases: [],
  allowUnitPicking: false,
  caseOnly: true,
  unitSize: 1,
  caseSize: 12,
  active: true,
}

function catalog(...products: VerifiedCatalogProduct[]): VerifiedProductCatalog {
  return new VerifiedProductCatalog(products)
}

function sourceQuantities(caseQuantity: number | null, unitsPerCase: number | null, totalUnits: number | null) {
  return { caseQuantity, unitsPerCase, totalUnits }
}

describe('packing suggestion', () => {
  it.each([
    { quantity: 5, expected: { cases: 0, units: 5 } },
    { quantity: 12, expected: { cases: 1, units: 0 } },
    { quantity: 25, expected: { cases: 2, units: 1 } },
  ])('splits a verified parenthesized item only from three physical source fields', ({ quantity, expected }) => {
    expect(
      getPackingSuggestion(
        {
          barcode: individuallyPickedProduct.barcode,
          productName: 'מוצר בודדים (12)',
          sourceQuantities: sourceQuantities(quantity, 1, quantity),
        },
        catalog(individuallyPickedProduct),
        configuration
      )
    ).toEqual({
      status: 'AVAILABLE',
      rule: 'INDIVIDUAL_PICKING_PARENTHESES',
      rulesVersion: '1.0.0',
      packSize: 12,
      ...expected,
    })
  })

  it('treats the documented 3 / 1 / 3 source columns as three individual units', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: individuallyPickedProduct.barcode,
          productName: 'מוצר בודדים (12)',
          sourceQuantities: sourceQuantities(3, 1, 3),
        },
        catalog(individuallyPickedProduct),
        configuration
      )
    ).toMatchObject({ status: 'AVAILABLE', cases: 0, units: 3 })
  })

  it('treats an approved 1/12 marker as whole cases only', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: caseOnlyProduct.barcode,
          productName: 'מוצר מארז 1/12',
          sourceQuantities: sourceQuantities(2, 12, 24),
        },
        catalog(caseOnlyProduct),
        configuration
      )
    ).toEqual({
      status: 'AVAILABLE',
      rule: 'CASE_ONLY_FRACTION',
      rulesVersion: '1.0.0',
      packSize: 12,
      cases: 2,
      units: 0,
    })
  })

  it('leaves 1/10 for review until it is explicitly configured', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: caseOnlyProduct.barcode,
          productName: 'מוצר מארז 1/10',
          sourceQuantities: sourceQuantities(2, 10, 20),
        },
        catalog(caseOnlyProduct),
        configuration
      )
    ).toMatchObject({ status: 'REVIEW_REQUIRED', code: 'SOURCE_MARKER_MISSING' })
  })

  it('does not ignore an additional unsupported marker beside an approved one', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: individuallyPickedProduct.barcode,
          productName: 'מוצר בודדים 1/10 (12)',
          sourceQuantities: sourceQuantities(3, 1, 3),
        },
        catalog(individuallyPickedProduct),
        configuration
      )
    ).toMatchObject({ status: 'REVIEW_REQUIRED', code: 'SOURCE_MARKER_AMBIGUOUS' })
  })

  it('requires review when the same source marker appears more than once', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: individuallyPickedProduct.barcode,
          productName: 'מוצר בודדים (12) (12)',
          sourceQuantities: sourceQuantities(3, 1, 3),
        },
        catalog(individuallyPickedProduct),
        configuration
      )
    ).toMatchObject({ status: 'REVIEW_REQUIRED', code: 'SOURCE_MARKER_AMBIGUOUS' })
  })

  it('does not calculate with an unsafe source quantity product', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: individuallyPickedProduct.barcode,
          productName: 'מוצר בודדים (12)',
          sourceQuantities: sourceQuantities(
            Number.MAX_SAFE_INTEGER,
            2,
            Number.MAX_SAFE_INTEGER
          ),
        },
        catalog(individuallyPickedProduct),
        configuration
      )
    ).toMatchObject({ status: 'REVIEW_REQUIRED', code: 'SOURCE_QUANTITIES_INCONSISTENT' })
  })

  it.each([
    {
      label: 'missing a physical source field',
      quantities: sourceQuantities(3, null, 3),
      code: 'SOURCE_QUANTITIES_INCOMPLETE',
    },
    {
      label: 'has incompatible physical source fields',
      quantities: sourceQuantities(3, 1, 4),
      code: 'SOURCE_QUANTITIES_INCONSISTENT',
    },
  ])('requires review when $label', ({ quantities, code }) => {
    expect(
      getPackingSuggestion(
        {
          barcode: individuallyPickedProduct.barcode,
          productName: 'מוצר בודדים (12)',
          sourceQuantities: quantities,
        },
        catalog(individuallyPickedProduct),
        configuration
      )
    ).toMatchObject({ status: 'REVIEW_REQUIRED', code })
  })

  it('uses the verified catalog over a conflicting source marker', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: individuallyPickedProduct.barcode,
          productName: 'מוצר בודדים (8)',
          sourceQuantities: sourceQuantities(5, 1, 5),
        },
        catalog(individuallyPickedProduct),
        configuration
      )
    ).toMatchObject({
      status: 'REVIEW_REQUIRED',
      code: 'CATALOG_PACK_SIZE_CONFLICT',
    })
  })

  it('does not allow a parenthesized marker to override a case-only catalog product', () => {
    expect(
      getPackingSuggestion(
        {
          barcode: caseOnlyProduct.barcode,
          productName: 'מוצר מארז (12)',
          sourceQuantities: sourceQuantities(5, 1, 5),
        },
        catalog(caseOnlyProduct),
        configuration
      )
    ).toMatchObject({
      status: 'REVIEW_REQUIRED',
      code: 'CATALOG_PICKING_POLICY_CONFLICT',
    })
  })

  it.each([
    {
      input: {
        productName: 'מוצר לא מוכר (12)',
        sourceQuantities: sourceQuantities(3, 1, 3),
      },
      products: [individuallyPickedProduct],
      code: 'PRODUCT_UNRESOLVED',
    },
    {
      input: {
        barcode: individuallyPickedProduct.barcode,
        sku: caseOnlyProduct.sku,
        productName: 'מוצר בודדים (12)',
        sourceQuantities: sourceQuantities(3, 1, 3),
      },
      products: [individuallyPickedProduct, caseOnlyProduct],
      code: 'PRODUCT_CONFLICT',
    },
    {
      input: {
        barcode: individuallyPickedProduct.barcode,
        productName: 'מוצר בודדים (12)',
        sourceQuantities: sourceQuantities(3, 1, 3),
      },
      products: [
        { ...individuallyPickedProduct, verificationStatus: 'unverified' as const },
      ],
      code: 'PRODUCT_UNVERIFIED',
    },
  ])('requires review for non-operational catalog resolution: $code', ({ input, products, code }) => {
    expect(
      getPackingSuggestion(input, catalog(...products), configuration)
    ).toMatchObject({ status: 'REVIEW_REQUIRED', code })
  })
})
