/**
 * Operational catalog surface.
 *
 * Legacy catalog services are intentionally not exported here. They use an
 * incompatible, non-traceable product model and are quarantined until they are
 * rewritten against the Foundation contracts.
 */
export {
  VerifiedProductCatalog,
  type CatalogVerificationStatus,
  type ProductLookupInput,
  type ProductResolution,
  type ProductResolutionMethod,
  type VerifiedCatalogProduct,
} from './verified-catalog'

export { normalizeCatalogProductName } from './product-name-normalization'

export {
  loadCityRouteCatalogReadiness,
  type CityRouteCatalogReadiness,
  type CityRouteCatalogReadinessIssueCode,
} from './city-route-catalog-readiness'

export {
  loadVerifiedCatalog,
  VerifiedCatalogConfigurationError,
  type LoadedVerifiedCatalog,
  type VerifiedCatalogReadiness,
} from './verified-catalog-loader'

export {
  allowsIndividualUnitPicking,
  catalogPickingMode,
  hasConsistentPickingConfiguration,
  type CatalogPickingMode,
} from './picking-policy'

export {
  CATALOG_ONBOARDING_TEMPLATE_COLUMNS,
  CATALOG_ONBOARDING_TEMPLATE_FILENAME,
  createCatalogOnboardingTemplateCsv,
} from './onboarding-template'

export {
  preflightCatalogOnboardingCsv,
} from './onboarding-preflight'

export {
  CATALOG_ONBOARDING_FILE_INPUT_ACCEPT,
  CATALOG_ONBOARDING_SUPPORTED_CSV_TYPES,
  catalogOnboardingPreflightFailureCodeFromResponse,
  getCatalogOnboardingFileSelectionIssue,
  isCatalogOnboardingPreflightResult,
  isSupportedCatalogOnboardingCsvType,
  MAX_CATALOG_ONBOARDING_CELL_CHARACTERS,
  MAX_CATALOG_ONBOARDING_CSV_BYTES,
  MAX_CATALOG_ONBOARDING_ISSUES,
  MAX_CATALOG_ONBOARDING_MULTIPART_BYTES,
  MAX_CATALOG_ONBOARDING_ROWS,
  type CatalogOnboardingFileMetadata,
  type CatalogOnboardingFileSelectionIssue,
  type CatalogOnboardingPreflightFailureCode,
  type CatalogOnboardingPreflightIssue,
  type CatalogOnboardingPreflightIssueCode,
  type CatalogOnboardingPreflightResult,
  type CatalogOnboardingSupportedCsvType,
  type CatalogOnboardingTemplateColumn,
} from './onboarding-preflight-policy'
