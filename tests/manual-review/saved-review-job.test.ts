import {
  createSavedReviewJob,
  loadSavedReviewJob,
  loadSavedReviewJobs,
  MAX_SAVED_REVIEW_JOBS,
  readSavedReviewJobs,
  removeSavedReviewJob,
  SAVED_REVIEW_JOB_STORAGE_KEY,
  SAVED_REVIEW_JOB_TTL_MS,
  saveSavedReviewJob,
  type LocalStorageLike,
} from '@/lib/manual-review/saved-review-job'
import { manualReviewResultFromResponse } from '@/lib/manual-review/success-response'

const REVIEW_ID = 'manual-review-123e4567-e89b-42d3-a456-426614174000'
const SAVED_JOB_ID = 'review-123e4567-e89b-42d3-a456-426614174000'

class MemoryStorage implements LocalStorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

class ThrowingStorage implements LocalStorageLike {
  getItem(): string | null {
    throw new Error('storage disabled')
  }

  setItem(): void {
    throw new Error('storage disabled')
  }

  removeItem(): void {
    throw new Error('storage disabled')
  }
}

function safeResult() {
  const result = manualReviewResultFromResponse(
    {
      reviewId: REVIEW_ID,
      catalog: {
        version: '1.3.0',
        totalProducts: 124,
        verifiedProducts: 124,
        unverifiedProducts: 0,
        privateCatalogField: 'do-not-retain',
      },
      totals: [
        {
          product: {
            productKey: 'private-product-key',
            barcode: '07290020531001',
            sku: '92101',
            name: 'טורבו גלידת חלבון שוקולד',
            resolvedBy: 'barcode',
          },
          cases: {
            value: 1,
            sources: [
              {
                page: {
                  jobId: 'private-server-document-id',
                  documentOrdinal: 2,
                  pageNumber: 3,
                  pageId: 'private-page-id',
                },
                row: {
                  rowNumber: 5,
                  rowId: 'private-row-id',
                  rawText: 'private customer order text',
                },
              },
            ],
          },
          units: {
            value: 4,
            sources: [
              {
                page: {
                  jobId: 'private-server-document-id',
                  documentOrdinal: 2,
                  pageNumber: 3,
                },
                row: { rowNumber: 5 },
              },
            ],
          },
        },
      ],
      issues: [
        {
          code: 'UNITS_AT_OR_ABOVE_CASE_SIZE',
          message: 'private server message',
          severity: 'warn',
          stage: 'row',
          source: {
            page: { jobId: 'private-server-document-id', pageNumber: 3 },
            row: { rowNumber: 5, rawText: 'private customer order text' },
          },
        },
      ],
      acceptedRowCount: 1,
      totalRowCount: 1,
      routeSummaries: [
        {
          routeCode: '1',
          totals: [
            {
              product: {
                productKey: 'private-product-key',
                barcode: '07290020531001',
                sku: '92101',
                name: 'טורבו גלידת חלבון שוקולד',
                resolvedBy: 'barcode',
              },
              cases: {
                value: 1,
                sources: [
                  {
                    page: {
                      jobId: 'private-server-document-id',
                      documentOrdinal: 2,
                      pageNumber: 3,
                    },
                    row: { rowNumber: 5 },
                  },
                ],
              },
              units: {
                value: 4,
                sources: [
                  {
                    page: {
                      jobId: 'private-server-document-id',
                      documentOrdinal: 2,
                      pageNumber: 3,
                    },
                    row: { rowNumber: 5 },
                  },
                ],
              },
            },
          ],
          acceptedRowCount: 1,
          totalRowCount: 1,
        },
      ],
      unassignedRouteAcceptedRowCount: 0,
      unassignedRouteRowCount: 0,
    },
    1
  )

  if (!result) {
    throw new Error('expected a response-whitelisted result')
  }

  return result
}

describe('saved review jobs', () => {
  it('creates a narrow local snapshot without source text, opaque IDs, or review IDs', () => {
    const job = createSavedReviewJob(safeResult(), SAVED_JOB_ID, 1_000)

    expect(job).toEqual({
      kind: 'SAVED_REVIEW_JOB_V1',
      id: SAVED_JOB_ID,
      savedAtMs: 1_000,
      catalog: {
        version: '1.3.0',
        totalProducts: 124,
        verifiedProducts: 124,
        unverifiedProducts: 0,
      },
      totals: [
        {
          sku: '92101',
          barcode: '07290020531001',
          productName: 'טורבו גלידת חלבון שוקולד',
          cases: 1,
          units: 4,
          caseSources: [{ documentOrdinal: 2, pageNumber: 3, rowNumber: 5 }],
          unitSources: [{ documentOrdinal: 2, pageNumber: 3, rowNumber: 5 }],
        },
      ],
      acceptedRowCount: 1,
      totalRowCount: 1,
      warningCount: 1,
      routeSummaries: [
        {
          routeCode: '1',
          totals: [
            {
              sku: '92101',
              barcode: '07290020531001',
              productName: 'טורבו גלידת חלבון שוקולד',
              cases: 1,
              units: 4,
              caseSources: [{ documentOrdinal: 2, pageNumber: 3, rowNumber: 5 }],
              unitSources: [{ documentOrdinal: 2, pageNumber: 3, rowNumber: 5 }],
            },
          ],
          acceptedRowCount: 1,
          totalRowCount: 1,
        },
      ],
      unassignedRouteAcceptedRowCount: 0,
      unassignedRouteRowCount: 0,
    })

    const serialized = JSON.stringify(job)
    for (const privateValue of [
      'private',
      'rawText',
      'jobId',
      'pageId',
      'rowId',
      'reviewId',
      'manual-review-123',
    ]) {
      expect(serialized).not.toContain(privateValue)
    }
  })

  it('stores, reloads, and explicitly removes a current local snapshot', () => {
    const storage = new MemoryStorage()
    const job = createSavedReviewJob(safeResult(), SAVED_JOB_ID, 1_000)
    if (!job) {
      throw new Error('expected saved job')
    }

    expect(saveSavedReviewJob(storage, job, 2_000)).toEqual({
      status: 'SAVED',
      job,
    })
    expect(loadSavedReviewJob(storage, SAVED_JOB_ID, 2_000)).toEqual(job)
    expect(loadSavedReviewJobs(storage, 2_000)).toEqual([job])
    expect(removeSavedReviewJob(storage, SAVED_JOB_ID, 2_000)).toBe(true)
    expect(loadSavedReviewJobs(storage, 2_000)).toEqual([])
  })

  it('removes malformed, future, and expired browser data before it is displayed', () => {
    const storage = new MemoryStorage()
    storage.setItem(SAVED_REVIEW_JOB_STORAGE_KEY, '{not-json')
    expect(loadSavedReviewJobs(storage, 2_000)).toEqual([])
    expect(storage.getItem(SAVED_REVIEW_JOB_STORAGE_KEY)).toBeNull()

    const job = createSavedReviewJob(safeResult(), SAVED_JOB_ID, 1_000)
    if (!job) {
      throw new Error('expected saved job')
    }

    storage.setItem(
      SAVED_REVIEW_JOB_STORAGE_KEY,
      JSON.stringify({
        kind: 'SAVED_REVIEW_JOB_STORE_V1',
        jobs: [{ ...job, savedAtMs: 2_001 }],
      })
    )
    expect(loadSavedReviewJobs(storage, 2_000)).toEqual([])
    expect(storage.getItem(SAVED_REVIEW_JOB_STORAGE_KEY)).toBeNull()

    storage.setItem(
      SAVED_REVIEW_JOB_STORAGE_KEY,
      JSON.stringify({ kind: 'SAVED_REVIEW_JOB_STORE_V1', jobs: [job] })
    )
    expect(loadSavedReviewJobs(storage, 1_000 + SAVED_REVIEW_JOB_TTL_MS + 1)).toEqual([])
    expect(storage.getItem(SAVED_REVIEW_JOB_STORAGE_KEY)).toBeNull()
  })

  it('keeps a valid local snapshot when another stored entry is malformed', () => {
    const storage = new MemoryStorage()
    const job = createSavedReviewJob(safeResult(), SAVED_JOB_ID, 1_000)
    if (!job) {
      throw new Error('expected saved job')
    }

    storage.setItem(
      SAVED_REVIEW_JOB_STORAGE_KEY,
      JSON.stringify({
        kind: 'SAVED_REVIEW_JOB_STORE_V1',
        jobs: [
          job,
          {
            ...job,
            id: 'review-123e4567-e89b-42d3-a456-426614174001',
            totals: [],
          },
        ],
      })
    )

    expect(loadSavedReviewJobs(storage, 2_000)).toEqual([job])
    expect(storage.getItem(SAVED_REVIEW_JOB_STORAGE_KEY)).not.toContain('426614174001')
  })

  it('rejects invalid source data and does not discard an older save when the list is full', () => {
    const storage = new MemoryStorage()
    const seed = createSavedReviewJob(safeResult(), SAVED_JOB_ID, 1_000)
    if (!seed) {
      throw new Error('expected saved job')
    }

    const invalid = {
      ...seed,
      totals: [{ ...seed.totals[0], caseSources: [] }],
    }
    expect(saveSavedReviewJob(storage, invalid as never, 2_000)).toEqual({
      status: 'INVALID_JOB',
    })

    for (let index = 0; index < MAX_SAVED_REVIEW_JOBS; index += 1) {
      const job = createSavedReviewJob(
        safeResult(),
        `review-123e4567-e89b-42d3-a456-4266141740${String(index).padStart(2, '0')}`,
        1_000 + index
      )
      if (!job) {
        throw new Error('expected saved job')
      }
      expect(saveSavedReviewJob(storage, job, 2_000).status).toBe('SAVED')
    }

    const overflow = createSavedReviewJob(
      safeResult(),
      'review-123e4567-e89b-42d3-a456-426614174099',
      2_000
    )
    if (!overflow) {
      throw new Error('expected overflow job')
    }

    expect(saveSavedReviewJob(storage, overflow, 2_000)).toEqual({
      status: 'LIMIT_REACHED',
    })
    expect(loadSavedReviewJobs(storage, 2_000)).toHaveLength(MAX_SAVED_REVIEW_JOBS)
  })

  it('rejects route claims that are not a subset of the saved global result', () => {
    const storage = new MemoryStorage()
    const job = createSavedReviewJob(safeResult(), SAVED_JOB_ID, 1_000)
    if (!job) {
      throw new Error('expected saved job')
    }

    const [routeSummary] = job.routeSummaries
    const [routeTotal] = routeSummary?.totals ?? []
    const [caseSource] = routeTotal?.caseSources ?? []
    const [unitSource] = routeTotal?.unitSources ?? []
    const [globalTotal] = job.totals
    if (!routeSummary || !routeTotal || !caseSource || !unitSource || !globalTotal) {
      throw new Error('expected a routed total with source positions')
    }

    const foreignProduct = {
      ...job,
      routeSummaries: [
        {
          ...routeSummary,
          totals: [{ ...routeTotal, productName: 'פריט זר שהוזרק' }],
        },
      ],
    }
    const inflatedQuantity = {
      ...job,
      routeSummaries: [
        {
          ...routeSummary,
          totals: [{ ...routeTotal, cases: routeTotal.cases + 1 }],
        },
      ],
    }
    const foreignSource = {
      ...job,
      routeSummaries: [
        {
          ...routeSummary,
          totals: [
            {
              ...routeTotal,
              caseSources: [
                {
                  documentOrdinal: caseSource.documentOrdinal,
                  pageNumber: caseSource.pageNumber,
                  rowNumber: caseSource.rowNumber + 99,
                },
              ],
            },
          ],
        },
      ],
    }
    const unanchoredSource = {
      ...job,
      routeSummaries: [
        {
          ...routeSummary,
          totals: [
            {
              ...routeTotal,
              caseSources: [
                {
                  pageNumber: caseSource.pageNumber,
                  rowNumber: caseSource.rowNumber,
                },
              ],
            },
          ],
        },
      ],
    }
    const extraCaseSource = { ...caseSource, rowNumber: caseSource.rowNumber + 1 }
    const extraUnitSource = { ...unitSource, rowNumber: unitSource.rowNumber + 1 }
    const routeSourceReusedAcrossRoutes = {
      ...job,
      acceptedRowCount: 2,
      totalRowCount: 2,
      totals: [
        {
          ...globalTotal,
          cases: globalTotal.cases * 2,
          units: globalTotal.units * 2,
          caseSources: [caseSource, extraCaseSource],
          unitSources: [unitSource, extraUnitSource],
        },
      ],
      routeSummaries: [
        routeSummary,
        {
          ...routeSummary,
          routeCode: '2',
          totals: [routeTotal],
        },
      ],
      unassignedRouteAcceptedRowCount: 0,
      unassignedRouteRowCount: 0,
    }

    for (const unsafeJob of [
      foreignProduct,
      inflatedQuantity,
      foreignSource,
      unanchoredSource,
      routeSourceReusedAcrossRoutes,
    ]) {
      storage.setItem(
        SAVED_REVIEW_JOB_STORAGE_KEY,
        JSON.stringify({ kind: 'SAVED_REVIEW_JOB_STORE_V1', jobs: [unsafeJob] })
      )

      expect(loadSavedReviewJobs(storage, 2_000)).toEqual([])
      expect(storage.getItem(SAVED_REVIEW_JOB_STORAGE_KEY)).toBeNull()
    }
  })

  it('returns a fixed storage outcome when browser storage is unavailable', () => {
    const job = createSavedReviewJob(safeResult(), SAVED_JOB_ID, 1_000)
    if (!job) {
      throw new Error('expected saved job')
    }

    const storage = new ThrowingStorage()
    expect(readSavedReviewJobs(storage, 2_000)).toEqual({
      status: 'STORAGE_UNAVAILABLE',
    })
    expect(loadSavedReviewJobs(storage, 2_000)).toEqual([])
    expect(loadSavedReviewJob(storage, SAVED_JOB_ID, 2_000)).toBeNull()
    expect(removeSavedReviewJob(storage, SAVED_JOB_ID, 2_000)).toBe(false)
    expect(saveSavedReviewJob(storage, job, 2_000)).toEqual({
      status: 'STORAGE_UNAVAILABLE',
    })
  })
})
