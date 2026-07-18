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

export {
  loadVerifiedCatalog,
  VerifiedCatalogConfigurationError,
  type LoadedVerifiedCatalog,
  type VerifiedCatalogReadiness,
} from './verified-catalog-loader'

export {
  CATALOG_ONBOARDING_TEMPLATE_COLUMNS,
  CATALOG_ONBOARDING_TEMPLATE_FILENAME,
  createCatalogOnboardingTemplateCsv,
} from './onboarding-template'
