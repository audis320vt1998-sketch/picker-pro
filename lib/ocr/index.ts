/**
 * OCR Module - Main exports
 * 
 * Includes:
 * - Region-based text extraction
 * - Hebrew document parsing
 * - OCR layout configuration
 */

export { RegionMapper, type ExtractedRegion, type RegionExtractionResult } from './region-mapper'
export {
  HebrewPickingListParser,
  HebrewUtils,
  type HebrewParsingOptions
} from './hebrew-parser'
export {
  HEBREW_LAYOUT,
  ENGLISH_LAYOUT,
  getLayout,
  getLayoutByLanguage,
  listLayouts,
  type Region,
  type PickingListLayout
} from './layouts'
