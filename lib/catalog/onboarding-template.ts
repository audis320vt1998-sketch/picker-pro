/**
 * This is a header-only handoff template, not an importer. It deliberately
 * contains no candidate product data and no verified value, so downloading it
 * can never change the active catalog or authorize operational picking.
 */
export const CATALOG_ONBOARDING_TEMPLATE_COLUMNS = [
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
] as const

export const CATALOG_ONBOARDING_TEMPLATE_FILENAME =
  'picker-pro-catalog-template.csv'

/**
 * The UTF-8 BOM makes Hebrew column data display correctly when the downloaded
 * file is opened directly in common spreadsheet applications. CRLF keeps the
 * blank template legible there without pretending it is ready to import.
 */
export function createCatalogOnboardingTemplateCsv(): string {
  return `\uFEFF${CATALOG_ONBOARDING_TEMPLATE_COLUMNS.join(',')}\r\n`
}
