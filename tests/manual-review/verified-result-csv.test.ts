import {
  createVerifiedResultCsv,
  createVerifiedResultCsvFilename,
  VERIFIED_RESULT_CSV_COLUMNS,
} from '@/lib/manual-review/verified-result-csv'
import type { SavedReviewJobV1 } from '@/lib/manual-review/saved-review-job'

function savedJob(overrides: Partial<SavedReviewJobV1> = {}): SavedReviewJobV1 {
  const total = {
    sku: '092101',
    barcode: '07290020531001',
    productName: 'טורבו "חלבון"',
    cases: 3,
    units: 4,
    caseSources: [{ documentOrdinal: 7, pageNumber: 991, rowNumber: 772 }],
    unitSources: [{ documentOrdinal: 7, pageNumber: 991, rowNumber: 772 }],
  }

  return {
    kind: 'SAVED_REVIEW_JOB_V1',
    id: 'review-not-for-csv-123e4567-e89b-42d3-a456-426614174000',
    savedAtMs: Date.UTC(2026, 6, 28, 12, 34, 56),
    catalog: {
      version: '1.3.0',
      totalProducts: 1,
      verifiedProducts: 1,
      unverifiedProducts: 0,
    },
    totals: [total],
    acceptedRowCount: 1,
    totalRowCount: 1,
    warningCount: 0,
    routeSummaries: [
      { routeCode: '77', totals: [total], acceptedRowCount: 1, totalRowCount: 1 },
    ],
    unassignedRouteAcceptedRowCount: 0,
    unassignedRouteRowCount: 0,
    ...overrides,
  }
}

describe('verified result CSV', () => {
  it('writes a UTF-8 BOM, CRLF rows, escaped text, and no route or source data', () => {
    const job = savedJob()
    const csv = createVerifiedResultCsv(job)

    expect(csv).toBe(
      [
        `\uFEFF${VERIFIED_RESULT_CSV_COLUMNS.join(',')}`,
        `"'092101","'07290020531001","טורבו ""חלבון""",3,4`,
        '',
      ].join('\r\n')
    )
    for (const omittedValue of [
      'review-not-for-csv',
      '77',
      '991',
      '772',
      '1.3.0',
    ]) {
      expect(csv).not.toContain(omittedValue)
    }
  })

  it('neutralizes spreadsheet formulas and keeps optional empty identifiers empty', () => {
    const [total] = savedJob().totals
    if (!total) {
      throw new Error('expected total')
    }

    const csv = createVerifiedResultCsv(
      savedJob({
        totals: [
          {
            ...total,
            sku: '=SUM(1,1)',
            barcode: '+972',
            productName: '\r\n@HYPERLINK("https://invalid")',
            cases: 0,
            units: 0,
          },
        ],
      })
    )

    expect(csv).toContain(`"'=SUM(1,1)"`)
    expect(csv).toContain(`"'+972"`)
    expect(csv).toContain(`"'\r\n@HYPERLINK(""https://invalid"")"`)
    expect(
      createVerifiedResultCsv(savedJob({ totals: [{ ...total, sku: '', barcode: '' }] }))
    ).toContain('"","","טורבו ""חלבון""",3,4')
  })

  it('rejects unusable or malformed data without throwing', () => {
    const [total] = savedJob().totals
    if (!total) {
      throw new Error('expected total')
    }

    expect(createVerifiedResultCsv(null)).toBeNull()
    expect(createVerifiedResultCsv(savedJob({ totals: [] }))).toBeNull()
    expect(createVerifiedResultCsv(savedJob({ acceptedRowCount: 0 }))).toBeNull()
    expect(
      createVerifiedResultCsv(
        savedJob({ totals: [{ ...total, cases: Number.POSITIVE_INFINITY }] })
      )
    ).toBeNull()
    expect(createVerifiedResultCsv({ ...savedJob(), totals: [null] })).toBeNull()
  })

  it('creates a stable UTC-only filename without result details', () => {
    expect(createVerifiedResultCsvFilename(Date.UTC(2026, 6, 28, 12, 34, 56))).toBe(
      'picker-pro-verified-summary-20260728123456.csv'
    )
  })
})
