import {
  loadVerifiedCatalog,
  VerifiedCatalogConfigurationError,
} from '../../lib/catalog/verified-catalog-loader'

const baseProduct = {
  productKey: 'product-one',
  barcode: '7290000000001',
  sku: 'SKU-001',
  verificationStatus: 'verified',
  name: 'Verified Product',
  aliases: [],
  allowUnitPicking: true,
  caseOnly: false,
  unitSize: 1,
  caseSize: 12,
  active: true,
}

describe('loadVerifiedCatalog', () => {
  it('loads the complete verified warehouse catalog with its picking rules', () => {
    const { catalog, readiness } = loadVerifiedCatalog()

    expect(readiness).toEqual({
      version: '1.3.0',
      totalProducts: 124,
      verifiedProducts: 124,
      unverifiedProducts: 0,
    })

    expect(catalog.resolve({ sku: '92101' })).toMatchObject({
      status: 'resolved',
      product: {
        productKey: 'sku-92101',
        barcode: '7290020531001',
        caseSize: 10,
        caseOnly: true,
      },
    })
    expect(catalog.resolve({ sku: '88900' })).toMatchObject({
      status: 'resolved',
      product: {
        allowUnitPicking: true,
        caseOnly: false,
        caseSize: 8,
      },
    })
    expect(catalog.resolve({ sku: '88135' })).toMatchObject({
      status: 'resolved',
      product: {
        allowUnitPicking: false,
        caseOnly: true,
        caseSize: 6,
      },
    })
  })

  it('rejects identifiers that duplicate after whitespace normalization', () => {
    expect(() =>
      loadVerifiedCatalog({
        version: 'test',
        products: [
          baseProduct,
          {
            ...baseProduct,
            productKey: 'product-two',
            barcode: ' 7290000000001 ',
            sku: 'SKU-002',
          },
        ],
      })
    ).toThrow(VerifiedCatalogConfigurationError)
  })

  it('rejects an empty identifier instead of treating it as an unknown value', () => {
    expect(() =>
      loadVerifiedCatalog({
        version: 'test',
        products: [{ ...baseProduct, barcode: '' }],
      })
    ).toThrow(VerifiedCatalogConfigurationError)
  })
})
