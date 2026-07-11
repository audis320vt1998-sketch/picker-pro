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
