import { VerifiedProductCatalog } from '../../lib/catalog/verified-catalog'
import type { ParsedRow } from '../../lib/domain/types'
import { processExplicitRows } from '../../lib/foundation/explicit-row-processor'

const verifiedUnitProduct = {
  productKey: 'verified-unit-product',
  barcode: null,
  sku: 'SKU-UNIT-001',
  verificationStatus: 'verified' as const,
  name: 'Verified Unit Product (12)',
  aliases: [],
  allowUnitPicking: true,
  caseOnly: false,
  unitSize: 1,
  caseSize: 12,
  active: true,
}

const verifiedCaseOnlyProduct = {
  productKey: 'verified-case-only-product',
  barcode: null,
  sku: 'SKU-CASE-001',
  verificationStatus: 'verified' as const,
  name: 'Verified Case Product 1/12',
  aliases: [],
  allowUnitPicking: false,
  caseOnly: true,
  unitSize: 1,
  caseSize: 12,
  active: true,
}

const unverifiedProduct = {
  ...verifiedUnitProduct,
  productKey: 'unverified-product',
  sku: 'SKU-UNVERIFIED-001',
  verificationStatus: 'unverified' as const,
}

function row(
  overrides: Partial<ParsedRow> = {}
): ParsedRow {
  return {
    source: {
      page: { jobId: 'manual-review-1', pageNumber: 1 },
      row: { rowNumber: 1 },
    },
    rawText: 'SKU-UNIT-001 Verified Unit Product (12)',
    productHint: 'Verified Unit Product (12)',
    sku: 'SKU-UNIT-001',
    cases: 0,
    units: 0,
    ...overrides,
  }
}

describe('processExplicitRows', () => {
  it('aggregates explicit case and unit fields independently across pages', () => {
    const catalog = new VerifiedProductCatalog([verifiedUnitProduct])
    const firstRow = row({ cases: 2, units: 0 })
    const secondRow = row({
      source: {
        page: { jobId: 'manual-review-1', pageNumber: 2 },
        row: { rowNumber: 3 },
      },
      cases: 1,
      units: 3,
    })

    const result = processExplicitRows([firstRow, secondRow], catalog)

    expect(result.issues).toEqual([])
    expect(result.acceptedRowCount).toBe(2)
    expect(result.totals).toEqual([
      {
        product: {
          productKey: 'verified-unit-product',
          sku: 'SKU-UNIT-001',
          name: 'Verified Unit Product (12)',
          resolvedBy: 'sku',
        },
        cases: {
          value: 3,
          sources: [firstRow.source, secondRow.source],
        },
        units: {
          value: 3,
          sources: [firstRow.source, secondRow.source],
        },
      },
    ])
  })

  it('warns but never converts a unit value at or above the case size', () => {
    const catalog = new VerifiedProductCatalog([verifiedUnitProduct])

    const result = processExplicitRows([row({ cases: 0, units: 25 })], catalog)

    expect(result.acceptedRowCount).toBe(1)
    expect(result.issues).toEqual([
      {
        code: 'UNITS_AT_OR_ABOVE_CASE_SIZE',
        message:
          'The explicit individual-unit quantity reaches or exceeds the verified catalog case size; confirm it before picking.',
        severity: 'warn',
        stage: 'row',
        source: row().source,
        productKey: 'verified-unit-product',
      },
    ])
    expect(result.totals[0]?.cases.value).toBe(0)
    expect(result.totals[0]?.units.value).toBe(25)
  })

  it('warns when an explicit individual-unit quantity equals the case size', () => {
    const catalog = new VerifiedProductCatalog([verifiedUnitProduct])

    const result = processExplicitRows([row({ cases: 0, units: 12 })], catalog)

    expect(result.acceptedRowCount).toBe(1)
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'UNITS_AT_OR_ABOVE_CASE_SIZE',
    ])
    expect(result.totals[0]?.cases.value).toBe(0)
    expect(result.totals[0]?.units.value).toBe(12)
  })

  it('does not apply the guardrail without a positive catalog case size', () => {
    const catalog = new VerifiedProductCatalog([
      {
        ...verifiedUnitProduct,
        productKey: 'unit-product-without-case-size',
        sku: 'SKU-UNIT-NO-CASE-SIZE',
        caseSize: null,
      },
    ])

    const result = processExplicitRows(
      [row({ sku: 'SKU-UNIT-NO-CASE-SIZE', cases: 0, units: 25 })],
      catalog
    )

    expect(result.acceptedRowCount).toBe(1)
    expect(result.issues).toEqual([])
    expect(result.totals[0]?.units.value).toBe(25)
  })

  it('keeps unresolved, unverified, and conflicting products out of totals', () => {
    const barcodeProduct = {
      ...verifiedUnitProduct,
      productKey: 'barcode-product',
      barcode: '7290000000001',
      sku: 'SKU-BARCODE-001',
    }
    const skuProduct = {
      ...verifiedUnitProduct,
      productKey: 'second-product',
      sku: 'SKU-SECOND-001',
    }
    const catalog = new VerifiedProductCatalog([
      verifiedUnitProduct,
      unverifiedProduct,
      barcodeProduct,
      skuProduct,
    ])

    const result = processExplicitRows(
      [
        row({
          sku: 'SKU-UNVERIFIED-001',
          productHint: 'Unverified source text',
        }),
        row({
          sku: 'SKU-DOES-NOT-EXIST',
          productHint: 'Unknown source text',
        }),
        row({
          barcode: '7290000000001',
          sku: 'SKU-SECOND-001',
          productHint: 'Conflicting source text',
        }),
      ],
      catalog
    )

    expect(result.totals).toEqual([])
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'PRODUCT_UNVERIFIED',
      'PRODUCT_UNRESOLVED',
      'PRODUCT_CONFLICT',
    ])
  })

  it('requires review instead of changing a case-only product into unit picking', () => {
    const catalog = new VerifiedProductCatalog([verifiedCaseOnlyProduct])

    const result = processExplicitRows(
      [
        row({
          sku: 'SKU-CASE-001',
          productHint: 'Verified Case Product 1/12',
          cases: 1,
          units: 2,
        }),
      ],
      catalog
    )

    expect(result.totals).toEqual([])
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'UNIT_TYPE_ENFORCEMENT',
    ])
  })

  it('rejects invalid quantities instead of correcting them', () => {
    const catalog = new VerifiedProductCatalog([verifiedUnitProduct])

    const result = processExplicitRows([row({ cases: -1, units: 3 })], catalog)

    expect(result.totals).toEqual([])
    expect(result.issues.map((issue) => issue.code)).toEqual([
      'INVALID_QUANTITY',
    ])
  })
})
