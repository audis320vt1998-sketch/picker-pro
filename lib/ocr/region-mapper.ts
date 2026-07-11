/**
 * OCR Region Mapper
 * Extract text from specific regions of document images
 */

import type Tesseract from 'tesseract.js'
import type { Region, PickingListLayout } from './layouts'

export interface ExtractedRegion {
  region: Region
  text: string
  confidence: number
  bbox?: { x0: number; y0: number; x1: number; y1: number }
}

export interface RegionExtractionResult {
  timestamp: Date
  layout: string
  regions: ExtractedRegion[]
  rawLines: string[]
}

/**
 * OCR Region Mapper
 * Extracts text from specific regions using OCR
 */
export class RegionMapper {
  /**
   * Extract text from region coordinates
   * Simulates region-based OCR (in production, would use actual image processing)
   */
  static extractFromRegion(
    lines: string[],
    region: Region,
    pageWidth: number = 1200
  ): string[] {
    // Calculate percentage-based boundaries
    const xMinPercent = region.xMin / pageWidth
    const xMaxPercent = region.xMax / pageWidth

    const regionTexts: string[] = []

    for (const line of lines) {
      // Split line into words with approximate positions
      const words = line.split(/\s+/)
      const lineChars = line.length

      let currentPos = 0
      const wordsInRegion: string[] = []

      for (const word of words) {
        const wordStart = currentPos / lineChars
        const wordEnd = (currentPos + word.length) / lineChars

        // Check if word overlaps with region
        if (wordStart < xMaxPercent && wordEnd > xMinPercent) {
          wordsInRegion.push(word)
        }

        currentPos += word.length + 1 // +1 for space
      }

      if (wordsInRegion.length > 0) {
        regionTexts.push(wordsInRegion.join(' '))
      }
    }

    return regionTexts
  }

  /**
   * Extract all regions from document text
   */
  static extractRegions(
    text: string,
    layout: PickingListLayout
  ): RegionExtractionResult {
    const lines = text.split('\n').filter(line => line.trim())

    const extractedRegions: ExtractedRegion[] = []
    const pageWidth = layout.pageWidth || 1200

    for (const region of layout.regions) {
      const regionTexts = this.extractFromRegion(lines, region, pageWidth)
      const combinedText = regionTexts.join(' ').trim()

      // Calculate confidence based on text quality
      const confidence = this.calculateConfidence(combinedText)

      extractedRegions.push({
        region,
        text: combinedText,
        confidence
      })
    }

    return {
      timestamp: new Date(),
      layout: layout.id,
      regions: extractedRegions,
      rawLines: lines
    }
  }

  /**
   * Calculate confidence score for extracted text
   */
  private static calculateConfidence(text: string): number {
    if (!text) return 0

    let score = 1.0

    // Reduce confidence for very short text
    if (text.length < 3) score *= 0.5

    // Reduce confidence if text contains many special characters
    const specialCharCount = (text.match(/[^a-zA-Z0-9א-ת\s-]/g) || []).length
    if (specialCharCount > text.length * 0.3) score *= 0.7

    // Reduce confidence if text is mostly numbers but shouldn't be
    const numberRatio = (text.match(/[0-9]/g) || []).length / text.length
    if (numberRatio > 0.8 && text.length > 5) score *= 0.9

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Extract specific region by name
   */
  static extractRegionByName(
    text: string,
    layout: PickingListLayout,
    regionName: string
  ): ExtractedRegion | null {
    const result = this.extractRegions(text, layout)
    return result.regions.find(r => r.region.name === regionName) || null
  }

  /**
   * Parse extracted regions into structured data
   */
  static parseExtractedRegions(
    result: RegionExtractionResult
  ): {
    sku: string
    productName: string
    barcode: string
    quantity: string
  } | null {
    const skuRegion = result.regions.find(r => r.region.type === 'sku')
    const nameRegion = result.regions.find(r => r.region.type === 'name')
    const barcodeRegion = result.regions.find(r => r.region.type === 'barcode')
    const quantityRegion = result.regions.find(r => r.region.type === 'quantity')

    if (!skuRegion || !nameRegion || !quantityRegion) {
      return null
    }

    return {
      sku: skuRegion.text.trim(),
      productName: nameRegion.text.trim(),
      barcode: barcodeRegion?.text.trim() || '',
      quantity: quantityRegion.text.trim()
    }
  }

  /**
   * Validate region extraction results
   */
  static validateExtractionResult(result: RegionExtractionResult): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    const skuRegion = result.regions.find(r => r.region.type === 'sku')
    const nameRegion = result.regions.find(r => r.region.type === 'name')
    const quantityRegion = result.regions.find(r => r.region.type === 'quantity')

    if (!skuRegion || !skuRegion.text.trim()) {
      errors.push('SKU region is empty')
    }
    if (!nameRegion || !nameRegion.text.trim()) {
      errors.push('Product name region is empty')
    }
    if (!quantityRegion || !quantityRegion.text.trim()) {
      errors.push('Quantity region is empty')
    }

    // Check low confidence
    for (const region of result.regions) {
      if (region.confidence < 0.5) {
        errors.push(`Low confidence (${(region.confidence * 100).toFixed(0)}%) in ${region.region.label}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
