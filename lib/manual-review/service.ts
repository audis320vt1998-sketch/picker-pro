import { loadVerifiedCatalog } from '@/lib/catalog/verified-catalog-loader'
import {
  canonicalMaayanHeaderRouteCode,
  isOcrSourceDocumentRef,
} from '@/lib/document-intake'
import type { VerifiedProductCatalog } from '@/lib/catalog/verified-catalog'
import type { ParsedRow } from '@/lib/domain/types'
import { processExplicitRows } from '@/lib/foundation/explicit-row-processor'
import type {
  ManualReviewRequest,
  ManualReviewResult,
  ManualReviewRowInput,
  ManualReviewRouteSummary,
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

function hasOpaqueSourceDocumentRef(input: ManualReviewRowInput): boolean {
  return isOcrSourceDocumentRef(input.sourceDocumentRef)
}

/**
 * Re-evaluates the already explicit rows per confirmed route rather than
 * trying to split an aggregate total. ProductTotals intentionally retain
 * source locations but not each source's quantity contribution, so a second
 * deterministic evaluation is necessary for accurate route totals.
 */
function reviewRouteSummaries(
  inputs: readonly ManualReviewRowInput[],
  rows: readonly ParsedRow[],
  catalog: VerifiedProductCatalog
): ManualReviewRouteSummary[] {
  const rowsByRouteCode = new Map<string, ParsedRow[]>()

  for (const [index, input] of inputs.entries()) {
    const routeCode = canonicalMaayanHeaderRouteCode(input.routeCode)
    if (!routeCode || !hasOpaqueSourceDocumentRef(input)) {
      continue
    }

    const routeRows = rowsByRouteCode.get(routeCode) ?? []
    routeRows.push(rows[index])
    rowsByRouteCode.set(routeCode, routeRows)
  }

  return [...rowsByRouteCode.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([routeCode, routeRows]) => {
      const result = processExplicitRows(routeRows, catalog)
      return {
        routeCode,
        totals: result.totals,
        acceptedRowCount: result.acceptedRowCount,
        totalRowCount: result.totalRowCount,
      }
    })
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
  const routeSummaries = reviewRouteSummaries(request.rows, rows, catalog)
  const routedRowCount = routeSummaries.reduce(
    (count, summary) => count + summary.totalRowCount,
    0
  )
  const routedAcceptedRowCount = routeSummaries.reduce(
    (count, summary) => count + summary.acceptedRowCount,
    0
  )

  return {
    reviewId,
    catalog: readiness,
    ...result,
    routeSummaries,
    unassignedRouteRowCount: Math.max(0, result.totalRowCount - routedRowCount),
    unassignedRouteAcceptedRowCount: Math.max(
      0,
      result.acceptedRowCount - routedAcceptedRowCount
    ),
  }
}
