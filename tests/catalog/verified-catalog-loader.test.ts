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
