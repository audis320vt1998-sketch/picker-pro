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
      rulesVersion: '1.1.0',
      packSize: 8,
      cases: 0,
      units: 3,
    })
  })

  it.each([
    {
      marker: '1/10',
      barcode: '7290020531025',
      productName: 'טורבו גלידת חלבון וניל 1/10',
      packSize: 10,
    },
    {
      marker: '1/30',
      barcode: '0710497380546',
      productName: 'מעיין שלגון בצורת ענבים 70 מ״ל 1/30',
      packSize: 30,
    },
    {
      marker: '1/36',
      barcode: '7290018764831',
      productName: 'מעיין שלגון באבלס תות־קוקוס 1/36',
      packSize: 36,
    },
  ])(
    'returns a review-only whole-case suggestion for an approved $marker marker',
    async ({ barcode, productName, packSize }) => {
      const response = await POST(
        requestWithJson({
          barcode,
          productName,
          sourceQuantities: {
            caseQuantity: 2,
            unitsPerCase: packSize,
            totalUnits: 2 * packSize,
          },
        })
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        kind: 'PACKING_SUGGESTION',
        status: 'AVAILABLE',
        rule: 'CASE_ONLY_FRACTION',
        rulesVersion: '1.1.0',
        packSize,
        cases: 2,
        units: 0,
      })
    }
  )

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
      rulesVersion: '1.1.0',
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
