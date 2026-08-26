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
  /**
   * A page-level route code explicitly confirmed before OCR handoff. It is
   * bounded to 1–99 by the API and used only for a separate review summary;
   * it is not a city assignment or a source identifier.
   */
  routeCode?: string
  cases: number
  units: number
}

export interface ManualReviewRequest {
  rows: readonly ManualReviewRowInput[]
}

export interface ManualReviewRouteSummary {
  /** Canonical numeric display, so `01` and `1` are one route. */
  routeCode: string
  totals: ProductTotals[]
  acceptedRowCount: number
  totalRowCount: number
}

export interface ManualReviewResult {
  reviewId: string
  catalog: VerifiedCatalogReadiness
  totals: ProductTotals[]
  issues: ValidationIssue[]
  acceptedRowCount: number
  totalRowCount: number
  routeSummaries: ManualReviewRouteSummary[]
  /**
   * Accepted rows without a confirmed 1–99 route stay only in the global
   * review total. They are never guessed into a route summary.
   */
  unassignedRouteAcceptedRowCount: number
  /** Submitted rows without a confirmed route code. */
  unassignedRouteRowCount: number
}
