import {
  CATALOG_ONBOARDING_TEMPLATE_COLUMNS,
  CATALOG_ONBOARDING_TEMPLATE_FILENAME,
  createCatalogOnboardingTemplateCsv,
} from '@/lib/catalog/onboarding-template'

describe('catalog onboarding template', () => {
  it('provides a UTF-8, header-only CSV for the active catalog contract', () => {
    expect(CATALOG_ONBOARDING_TEMPLATE_COLUMNS).toEqual([
      'productKey',
      'barcode',
      'sku',
      'verificationStatus',
      'name',
      'nameEn',
      'aliases',
      'allowUnitPicking',
      'caseOnly',
      'unitSize',
      'caseSize',
      'active',
    ])
    expect(CATALOG_ONBOARDING_TEMPLATE_FILENAME).toBe(
      'picker-pro-catalog-template.csv'
    )
    expect(createCatalogOnboardingTemplateCsv()).toBe(
      '\uFEFFproductKey,barcode,sku,verificationStatus,name,nameEn,aliases,allowUnitPicking,caseOnly,unitSize,caseSize,active\r\n'
    )
  })
})
