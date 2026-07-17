import { NextRequest } from 'next/server'
import { POST } from '../../app/api/manual-review/route'

function requestWithJson(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/manual-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
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
})
