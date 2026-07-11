/**
 * Hebrew Picking List Parser
 * Specialized parser for Hebrew OCR documents
 */

import type { PickingListLayout } from './layouts'
import { RegionMapper } from './region-mapper'
import type { ParsedRow } from '../parser/types'

export interface HebrewParsingOptions {
  layout: PickingListLayout
  normalizeHebrewText?: boolean
  allowPartialMatches?: boolean
}

/**
 * Hebrew Text Utilities
 */
export class HebrewUtils {
  /**
   * Check if text contains Hebrew characters
   */
  static isHebrew(text: string): boolean {
    return /[א-ת]/.test(text)
  }

  /**
   * Check if text is mixed Hebrew/English
   */
  static isMixed(text: string): boolean {
    const hasHebrew = /[א-ת]/.test(text)
    const hasEnglish = /[a-zA-Z]/.test(text)
    return hasHebrew && hasEnglish
  }

  /**
   * Normalize Hebrew text (remove diacritics)
   */
  static normalize(text: string): string {
    // Remove Hebrew diacritical marks
    return text
      .replace(/[\u0591-\u05C7]/g, '') // Remove all Hebrew diacritics
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Extract numbers from Hebrew/English mixed text
   */
  static extractNumbers(text: string): number[] {
    const numbers = text.match(/\d+/g) || []
    return numbers.map(n => parseInt(n, 10))
  }

  /**
   * Clean SKU text
   */
  static cleanSKU(text: string): string {
    return text
      .replace(/[^א-תa-zA-Z0-9\-]/g, '') // Keep only alphanumeric and hyphen
      .trim()
  }

  /**
   * Clean product name
   */
  static cleanProductName(text: string): string {
    return this.normalize(text).trim()
  }

  /**
   * Clean barcode
   */
  static cleanBarcode(text: string): string {
    return text
      .replace(/[^0-9]/g, '') // Keep only digits
      .trim()
  }

  /**
   * Clean quantity
   */
  static cleanQuantity(text: string): string {
    // Extract first number
    const numbers = this.extractNumbers(text)
    return numbers.length > 0 ? String(numbers[0]) : '0'
  }

  /**
   * Detect language
   */
  static detectLanguage(text: string): 'he' | 'en' | 'mixed' {
    const hebrewCount = (text.match(/[א-ת]/g) || []).length
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length

    if (hebrewCount > englishCount * 1.5) return 'he'
    if (englishCount > hebrewCount * 1.5) return 'en'
    return 'mixed'
  }
}

/**
 * Hebrew Picking List Parser
 */
export class HebrewPickingListParser {
  /**
   * Parse Hebrew picking list from text
   */
  static parse(
    text: string,
    options: HebrewParsingOptions
  ): ParsedRow[] {
    // Extract regions
    const extraction = RegionMapper.extractRegions(text, options.layout)

    // Validate extraction
    const validation = RegionMapper.validateExtractionResult(extraction)
    if (!validation.valid && !options.allowPartialMatches) {
      console.warn('Extraction validation errors:', validation.errors)
    }

    // Parse extracted regions
    const rows: ParsedRow[] = []
    const lines = extraction.rawLines

    for (const line of lines) {
      if (!line.trim()) continue

      // Extract from this specific line
      const lineExtraction = RegionMapper.extractRegions(line, options.layout)
      const parsed = RegionMapper.parseExtractedRegions(lineExtraction)

      if (parsed && parsed.sku) {
        // Normalize text if requested
        const sku = options.normalizeHebrewText
          ? HebrewUtils.normalize(parsed.sku)
          : parsed.sku

        const productName = options.normalizeHebrewText
          ? HebrewUtils.normalize(parsed.productName)
          : parsed.productName

        const barcode = HebrewUtils.cleanBarcode(parsed.barcode)
        const quantity = parseInt(HebrewUtils.cleanQuantity(parsed.quantity), 10)

        // Detect language
        const language = HebrewUtils.detectLanguage(productName)

        rows.push({
          sku,
          barcode,
          productName,
          quantity,
          unit: 'units',
          confidence: lineExtraction.regions[0]?.confidence || 0.8,
          language,
          status: 'Pending'
        })
      }
    }

    return rows
  }

  /**
   * Parse single line from picking list
   */
  static parseLine(
    line: string,
    options: HebrewParsingOptions
  ): ParsedRow | null {
    const rows = this.parse(line, options)
    return rows.length > 0 ? rows[0] : null
  }

  /**
   * Parse multiple lines
   */
  static parseLines(
    lines: string[],
    options: HebrewParsingOptions
  ): ParsedRow[] {
    const allRows: ParsedRow[] = []

    for (const line of lines) {
      const rows = this.parse(line, options)
      allRows.push(...rows)
    }

    return allRows
  }

  /**
   * Format parsed row as Hebrew text
   */
  static formatAsHebrew(row: ParsedRow): string {
    return `מק"ט: ${row.sku} | שם: ${row.productName} | כמות: ${row.quantity}`
  }

  /**
   * Validate Hebrew picking list row
   */
  static validateRow(
    row: ParsedRow
  ): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!row.sku || row.sku.length === 0) {
      errors.push('מק"ט חסר')
    }
    if (!row.productName || row.productName.length === 0) {
      errors.push('שם מוצר חסר')
    }
    if (!row.quantity || row.quantity <= 0) {
      errors.push('כמות לא תקינה')
    }
    if (row.confidence < 0.5) {
      errors.push('רמת ביטחון נמוכה')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
