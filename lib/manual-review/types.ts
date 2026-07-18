import type { ProductTotals, ValidationIssue } from '@/lib/domain/types'
import type { VerifiedCatalogReadiness } from '@/lib/catalog/verified-catalog-loader'

export interface ManualReviewRowInput {
  /**
   * A client-generated, opaque document token shared by rows from the same
   * source document. It must never contain a filename, customer name, or
   * other identifying document data.
   */
  sourceDocumentRef?: string
  pageNumber: number
  rowNumber: number
  rawText: string
  productName?: string
  barcode?: string
  sku?: string
  cases: number
  units: number
}

export interface ManualReviewRequest {
  rows: readonly ManualReviewRowInput[]
}

export interface ManualReviewResult {
  reviewId: string
  catalog: VerifiedCatalogReadiness
  totals: ProductTotals[]
  issues: ValidationIssue[]
  acceptedRowCount: number
  totalRowCount: number
}
