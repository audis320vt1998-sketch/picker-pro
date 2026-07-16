/**
 * PickingEngine – orchestrates the full OCR-to-result pipeline.
 * TODO: implement real OCR, parsing, validation and aggregation.
 */

import type {
  CatalogEntry,
  PickingResult,
  BatchStatistics,
} from './types'

export class PickingEngine {
  private batchId: string

  constructor(_catalog: CatalogEntry[] = [], batchId?: string) {
    this.batchId = batchId ?? `batch-${Date.now()}`
  }

  loadRules(_rules: unknown[]): void {
    // TODO: load rules into the engine
  }

  async process(_ocrText: string): Promise<PickingResult> {
    return this.emptyResult()
  }

  async processWithRules(_ocrText: string): Promise<PickingResult> {
    return this.emptyResult()
  }

  async exportResult(_result: PickingResult, _format: 'json' | 'csv'): Promise<string> {
    return ''
  }

  async exportFormatted(_result: PickingResult): Promise<object> {
    return {}
  }

  aggregateByCategory(
    _result: PickingResult
  ): Array<{ label: string; count: number; totalQuantity: number }> {
    return []
  }

  aggregateBySupplier(
    _result: PickingResult
  ): Array<{ label: string; count: number; totalQuantity: number }> {
    return []
  }

  aggregateByStatus(
    _result: PickingResult
  ): Array<{ label: string; count: number }> {
    return []
  }

  private emptyResult(): PickingResult {
    const statistics: BatchStatistics = {
      ocrAccuracy: 0,
      totalProducts: 0,
      totalCases: 0,
      totalUnits: 0,
      totalQuantity: 0,
    }
    return {
      batchId: this.batchId,
      timestamp: new Date(),
      statistics,
      products: [],
      warnings: [],
    }
  }
}
