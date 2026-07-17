import {
  VerifiedProductCatalog,
  type VerifiedCatalogProduct,
} from '../../lib/catalog/verified-catalog'

const verifiedProduct: VerifiedCatalogProduct = {
  productKey: 'verified-product',
  barcode: '7290000000001',
  sku: 'SKU-001',
  verificationStatus: 'verified',
  name: 'מוצר מאומת',
  aliases: ['Verified Product'],
  allowUnitPicking: true,
  caseOnly: false,
  unitSize: 1,
  caseSize: 12,
  active: true,
}

const unverifiedProduct: VerifiedCatalogProduct = {
  productKey: 'unverified-product',
  barcode: null,
  sku: null,
  verificationStatus: 'unverified',
  name: 'מוצר לבדיקה',
  aliases: ['Needs Review Product'],
  allowUnitPicking: true,
  caseOnly: false,
  unitSize: 1,
  caseSize: null,
  active: true,
}

describe('VerifiedProductCatalog', () => {
  it('uses barcode before every other exact identifier', () => {
    const catalog = new VerifiedProductCatalog([verifiedProduct])

    expect(
      catalog.resolve({
        barcode: '7290000000001',
        sku: 'SKU-001',
        productName: 'מוצר מאומת',
      })
    ).toEqual({
      status: 'resolved',
      product: verifiedProduct,
      resolvedBy: 'barcode',
    })
  })

  it('preserves an exact match to an unverified catalog record as unverified', () => {
    const catalog = new VerifiedProductCatalog([unverifiedProduct])

    expect(catalog.resolve({ productName: 'Needs Review Product' })).toEqual({
      status: 'unverified',
      product: unverifiedProduct,
      matchedBy: 'alias',
    })
  })

  it('does not use fuzzy matching for an unknown product name', () => {
    const catalog = new VerifiedProductCatalog([verifiedProduct])

    expect(catalog.resolve({ productName: 'Verified Prodct' })).toEqual({
      status: 'unresolved',
    })
  })

  it('does not resolve a catalog record by name alone when it has a barcode', () => {
    const catalog = new VerifiedProductCatalog([verifiedProduct])

    expect(catalog.resolve({ productName: verifiedProduct.name })).toEqual({
      status: 'unresolved',
    })
    expect(catalog.resolve({ productName: 'Verified Product' })).toEqual({
      status: 'unresolved',
    })
  })

  it('returns a conflict instead of choosing between contradictory identifiers', () => {
    const otherProduct: VerifiedCatalogProduct = {
      ...verifiedProduct,
      productKey: 'other-product',
      barcode: '7290000000002',
      sku: 'SKU-002',
      name: 'מוצר אחר',
    }
    const catalog = new VerifiedProductCatalog([verifiedProduct, otherProduct])

    expect(
      catalog.resolve({
        barcode: verifiedProduct.barcode,
        sku: otherProduct.sku,
      })
    ).toMatchObject({
      status: 'conflict',
      matchedBy: ['barcode', 'sku'],
    })
  })

  it('never resolves an inactive catalog record', () => {
    const catalog = new VerifiedProductCatalog([
      { ...verifiedProduct, active: false },
    ])

    expect(catalog.resolve({ sku: verifiedProduct.sku })).toEqual({
      status: 'unresolved',
    })
  })
})
