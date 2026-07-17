/**
 * Catalog Module - Main exports
 * 
 * Includes:
 * - Catalog service (in-memory)
 * - Catalog loader (JSON/CSV)
 * - Product database
 */

export { CatalogService, getCatalog, setCatalog } from './catalog'

export {
  CatalogLoader,
  initializeCatalog,
  getInitializedCatalog,
  resetCatalog
} from './loader'

export {
  VerifiedProductCatalog,
  type CatalogVerificationStatus,
  type ProductLookupInput,
  type ProductResolution,
  type ProductResolutionMethod,
  type VerifiedCatalogProduct,
} from './verified-catalog'
