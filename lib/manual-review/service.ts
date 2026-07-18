import { loadVerifiedCatalog } from '@/lib/catalog/verified-catalog-loader'
import type { ParsedRow } from '@/lib/domain/types'
import { processExplicitRows } from '@/lib/foundation/explicit-row-processor'
import type {
  ManualReviewRequest,
  ManualReviewResult,
  ManualReviewRowInput,
} from './types'

function toParsedRow(
  input: ManualReviewRowInput,
  reviewId: string
): ParsedRow {
  return {
    source: {
      page: {
        jobId: reviewId,
        pageNumber: input.pageNumber,
      },
      row: {
        rowNumber: input.rowNumber,
        rawText: input.rawText,
      },
    },
    rawText: input.rawText,
    productHint: input.productName ?? '',
    ...(input.barcode ? { barcode: input.barcode } : {}),
    ...(input.sku ? { sku: input.sku } : {}),
    cases: input.cases,
    units: input.units,
  }
}

/**
 * Evaluates a non-persistent manual review request. The review ID exists only
 * to connect every returned source reference to this one response; it does not
 * create a stored job or a pick list.
 */
export function reviewManualRows(
  request: ManualReviewRequest,
  reviewId: string
): ManualReviewResult {
  const { catalog, readiness } = loadVerifiedCatalog()
  const rows = request.rows.map((row) => toParsedRow(row, reviewId))
  const result = processExplicitRows(rows, catalog)

  return {
    reviewId,
    catalog: readiness,
    ...result,
  }
}
