import { loadVerifiedCatalog } from '@/lib/catalog/verified-catalog-loader'
import type { ParsedRow } from '@/lib/domain/types'
import { processExplicitRows } from '@/lib/foundation/explicit-row-processor'
import type {
  ManualReviewRequest,
  ManualReviewResult,
  ManualReviewRowInput,
} from './types'
import {
  createSourceDocumentOrdinals,
  sourceDocumentOrdinalForRow,
} from './document-ordinal'

function toParsedRow(
  input: ManualReviewRowInput,
  reviewId: string,
  documentOrdinal?: number
): ParsedRow {
  return {
    source: {
      page: {
        jobId: reviewId,
        ...(documentOrdinal ? { documentOrdinal } : {}),
        pageNumber: input.pageNumber,
      },
      row: {
        rowNumber: input.rowNumber,
      },
    },
    // rawText is needed while resolving this transient row, but source
    // references are returned to the browser and therefore retain only the
    // page/row location.
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
  const sourceDocumentOrdinals = createSourceDocumentOrdinals(request.rows)
  const rows = request.rows.map((row) =>
    toParsedRow(
      row,
      reviewId,
      sourceDocumentOrdinalForRow(row, sourceDocumentOrdinals)
    )
  )
  const result = processExplicitRows(rows, catalog)

  return {
    reviewId,
    catalog: readiness,
    ...result,
  }
}
