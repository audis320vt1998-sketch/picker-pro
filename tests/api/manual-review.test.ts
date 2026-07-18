import { NextRequest } from 'next/server'
import { POST } from '../../app/api/manual-review/route'

function requestWithJson(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/manual-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const sourceDocumentRef = 'doc_7e3ad2d4-0c9b-4d6e-a3c1-2f1b8a9c7d6e'
const secondSourceDocumentRef = 'doc_01234567-89ab-4def-8123-456789abcdef'

function validRow(overrides: Record<string, unknown> = {}) {
  return {
    pageNumber: 1,
    rowNumber: 1,
    rawText: '8000380213498',
    barcode: '8000380213498',
    cases: 1,
    units: 0,
    ...overrides,
  }
}

describe('POST /api/manual-review', () => {
  it('rejects quantities that would require implicit conversion or guessing', async () => {
    const response = await POST(
      requestWithJson({
        rows: [
          {
            pageNumber: 1,
            rowNumber: 1,
            rawText: '8000380213498',
            barcode: '8000380213498',
            cases: '1',
            units: 0,
          },
        ],
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Manual review input is invalid.',
      code: 'INVALID_MANUAL_REVIEW_INPUT',
    })
  })

  it('returns a review item instead of a picking total for an unverified catalog match', async () => {
    const response = await POST(
      requestWithJson({
        rows: [
          {
            pageNumber: 1,
            rowNumber: 1,
            rawText: '8000380213498',
            barcode: '8000380213498',
            cases: 1,
            units: 0,
          },
        ],
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toMatchObject({
      reviewId: expect.stringMatching(/^manual-review-/),
      catalog: {
        verifiedProducts: 0,
      },
      totals: [],
      acceptedRowCount: 0,
      totalRowCount: 1,
      issues: [
        {
          code: 'PRODUCT_UNVERIFIED',
          severity: 'fail',
          stage: 'row',
        },
      ],
    })
  })

  it('rejects duplicate rows that point to the same opaque document source', async () => {
    const response = await POST(
      requestWithJson({
        rows: [
          validRow({ sourceDocumentRef }),
          validRow({ sourceDocumentRef }),
        ],
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Manual review input is invalid.',
      code: 'INVALID_MANUAL_REVIEW_INPUT',
      details: [
        {
          row: 2,
          field: 'sourceDocumentRef',
          code: 'DUPLICATE_SOURCE_ROW',
          duplicateOfRow: 1,
        },
      ],
    })
  })

  it('allows distinct source rows from the same opaque document source', async () => {
    const response = await POST(
      requestWithJson({
        rows: [
          validRow({ sourceDocumentRef }),
          validRow({ sourceDocumentRef, rowNumber: 2 }),
        ],
      })
    )

    expect(response.status).toBe(200)
  })

  it('allows the same page and row when they come from distinct source documents', async () => {
    const response = await POST(
      requestWithJson({
        rows: [
          validRow({ sourceDocumentRef }),
          validRow({ sourceDocumentRef: secondSourceDocumentRef }),
        ],
      })
    )

    expect(response.status).toBe(200)
  })

  it('uses an opaque source reference only for request validation', async () => {
    const response = await POST(
      requestWithJson({
        rows: [validRow({ sourceDocumentRef })],
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(JSON.stringify(body)).not.toContain(sourceDocumentRef)
  })

  it('requires an opaque non-PII source document reference when one is provided', async () => {
    const response = await POST(
      requestWithJson({
        rows: [
          validRow({ sourceDocumentRef: 'customer-alice-order-123.pdf' }),
        ],
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Manual review input is invalid.',
      code: 'INVALID_MANUAL_REVIEW_INPUT',
      details: [
        {
          row: 1,
          field: 'sourceDocumentRef',
        },
      ],
    })
  })

  it('rejects source filenames and unknown row metadata without echoing them', async () => {
    const sourceFileName = 'customer-alice-order-123.jpg'
    const privateMetadata = 'customer-alice-private-note'
    const response = await POST(
      requestWithJson({
        rows: [
          validRow({
            sourceFileName,
            privateMetadata,
          }),
        ],
      })
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body).toMatchObject({
      error: 'Manual review input is invalid.',
      code: 'INVALID_MANUAL_REVIEW_INPUT',
      details: [
        {
          row: 1,
          field: 'row',
          code: 'UNSUPPORTED_ROW_FIELD',
        },
      ],
    })
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain(sourceFileName)
    expect(serialized).not.toContain(privateMetadata)
    expect(serialized).not.toContain('sourceFileName')
  })

  it('continues to accept rows without a source document reference', async () => {
    const response = await POST(
      requestWithJson({
        rows: [
          validRow(),
          validRow(),
        ],
      })
    )

    expect(response.status).toBe(200)
  })
})
