import { detectMaayanTableLayout, hasMinimumMaayanImageResolution } from './maayan-layout'
import { parseMaayanTable } from './maayan-table-parser'
import type {
  DocumentPreflightIssue,
  DocumentPreflightPage,
  DocumentPreflightResult,
  MaayanParsedRow,
  OcrPage,
} from './types'

function createPage(
  rows: DocumentPreflightPage['rows'],
  issues: readonly DocumentPreflightIssue[]
): DocumentPreflightResult {
  return {
    kind: 'DOCUMENT_PREFLIGHT',
    status: 'NEEDS_REVIEW',
    profile: 'MAAYAN_PRICE_OFFER_V1',
    pages: [
      {
        pageNumber: 1,
        rows,
        issues,
      },
    ],
  }
}

function toPreflightRow(row: MaayanParsedRow, parserRowIndex: number) {
  return {
    source: {
      pageNumber: 1,
      printedRowNumber: row.printedRowNumber,
      parserRowIndex,
    },
    sku: row.sku,
    barcode: row.barcode,
    trayBarcode: row.trayBarcode,
    productName: row.productName,
    sourceQuantities: row.rawQuantities,
    traceText: row.rawText,
    confidence: row.confidence,
    boundingBox: row.boundingBox,
    issues: row.issues,
  }
}

/**
 * Converts one in-memory OCR page into a review-only response. This function
 * never resolves a product catalog and never creates operational quantities.
 */
export function preflightMaayanOcrPage(page: OcrPage): DocumentPreflightResult {
  if (!hasMinimumMaayanImageResolution(page)) {
    return createPage([], [
      {
        code: 'IMAGE_TOO_LOW_RESOLUTION',
        message:
          'The photo is too low-resolution for traceable table OCR. Capture a sharper close-up or enter the rows manually.',
      },
    ])
  }

  if (page.recoveredRows && page.recoveredRows.length > 0) {
    return createPage(
      page.recoveredRows.map((row, index) => toPreflightRow(row, index + 1)),
      [
        {
          code: 'OCR_DRAFT_REQUIRES_REVIEW',
          message:
            'These targeted OCR fields are a draft only. Verify every product identifier and each source quantity before manual review.',
        },
      ]
    )
  }

  const layout = detectMaayanTableLayout(page)
  if (!layout) {
    return createPage([], [
      {
        code: 'DOCUMENT_LAYOUT_UNRECOGNIZED',
        message:
          'A Maayan table with a traceable row number, SKU, and product barcode was not recognized. No OCR rows were created.',
      },
    ])
  }

  const parsedRows = parseMaayanTable(page.words, layout)
  if (parsedRows.length === 0) {
    return createPage([], [
      {
        code: 'NO_TRACEABLE_ROWS',
        message:
          'The table layout was found, but no row had a traceable row number, SKU, and product barcode. No OCR rows were created.',
      },
    ])
  }

  return createPage(
    parsedRows.map((row, index) => toPreflightRow(row, index + 1)),
    [
      {
        code: 'OCR_DRAFT_REQUIRES_REVIEW',
        message:
          'These OCR fields are a draft only. Verify every product identifier and each source quantity before manual review.',
      },
    ]
  )
}
