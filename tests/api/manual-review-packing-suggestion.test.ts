import { NextRequest } from 'next/server'
import { POST } from '../../app/api/manual-review/packing-suggestion/route'

function requestWithJson(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/manual-review/packing-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/manual-review/packing-suggestion', () => {
  it('returns a review-only individual-picking suggestion from verified catalog data', async () => {
    const response = await POST(
      requestWithJson({
        barcode: '769828301927',
        productName: 'מעיין מלונה שלגון קוקוס 70 מ״ל שמיניה (8)',
        sourceQuantities: {
          caseQuantity: 3,
          unitsPerCase: 1,
          totalUnits: 3,
        },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      kind: 'PACKING_SUGGESTION',
      status: 'AVAILABLE',
      rule: 'INDIVIDUAL_PICKING_PARENTHESES',
      rulesVersion: '1.0.0',
      packSize: 8,
      cases: 0,
      units: 3,
    })
  })

  it('does not return input strings when a source marker conflicts with the catalog', async () => {
    const privateSourceName = 'private-source-name (12)'
    const response = await POST(
      requestWithJson({
        barcode: '769828301927',
        productName: privateSourceName,
        sourceQuantities: {
          caseQuantity: 3,
          unitsPerCase: 1,
          totalUnits: 3,
        },
      })
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      kind: 'PACKING_SUGGESTION',
      status: 'REVIEW_REQUIRED',
      code: 'CATALOG_PACK_SIZE_CONFLICT',
      rulesVersion: '1.0.0',
    })
    expect(JSON.stringify(body)).not.toContain(privateSourceName)
  })

  it('rejects unsupported fields without echoing them', async () => {
    const privateMetadata = 'customer-private-note'
    const response = await POST(
      requestWithJson({
        barcode: '769828301927',
        productName: 'שלגון (8)',
        sourceQuantities: {
          caseQuantity: 3,
          unitsPerCase: 1,
          totalUnits: 3,
        },
        privateMetadata,
      })
    )

    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const body = await response.json()
    expect(body).toMatchObject({
      code: 'INVALID_PACKING_SUGGESTION_INPUT',
    })
    expect(JSON.stringify(body)).not.toContain(privateMetadata)
  })

  it('requires three separately structured source quantities', async () => {
    const response = await POST(
      requestWithJson({
        barcode: '769828301927',
        productName: 'שלגון (8)',
        sourceQuantities: {
          caseQuantity: 3,
          totalUnits: 3,
        },
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: 'INVALID_PACKING_SUGGESTION_INPUT',
    })
  })
})
