import { NextRequest } from 'next/server'
import { POST } from '@/app/api/catalog/preflight/route'
import { CATALOG_ONBOARDING_TEMPLATE_COLUMNS } from '@/lib/catalog/onboarding-template'
import { MAX_CATALOG_ONBOARDING_CSV_BYTES } from '@/lib/catalog/onboarding-preflight-policy'

interface UploadedCsv {
  content: Uint8Array | string
  name: string
  type: string
}

function validCsv(): string {
  return [
    CATALOG_ONBOARDING_TEMPLATE_COLUMNS.join(','),
    'product-one,0729000000001,SKU-001,unverified,Private Product,,[],true,false,1,12,true',
  ].join('\r\n')
}

function requestWithFiles(
  files: readonly UploadedCsv[],
  includeUnexpectedField = false
): NextRequest {
  const form = new FormData()
  for (const file of files) {
    form.append('file', new Blob([file.content], { type: file.type }), file.name)
  }
  if (includeUnexpectedField) {
    form.append('unexpected', 'value')
  }

  return new NextRequest('http://localhost/api/catalog/preflight', {
    method: 'POST',
    body: form,
  })
}

describe('POST /api/catalog/preflight', () => {
  it('returns a no-store structural report without filename or raw CSV cells', async () => {
    const fileName = 'private-catalog-export.csv'
    const response = await POST(
      requestWithFiles([
        { name: fileName, type: 'text/csv', content: validCsv() },
      ])
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    const body = await response.json()
    expect(body).toEqual({
      kind: 'CATALOG_ONBOARDING_PREFLIGHT',
      status: 'READY_FOR_CONTROLLED_REVIEW',
      sideEffects: {
        imported: false,
        catalogUpdated: false,
        recordsVerified: false,
      },
      summary: {
        totalRows: 1,
        readyRows: 1,
        rowsWithErrors: 0,
        rowsWithWarnings: 0,
      },
      issues: [],
      issuesTruncated: false,
    })
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain(fileName)
    expect(serialized).not.toContain('Private Product')
    expect(serialized).not.toContain('0729000000001')
  })

  it('rejects missing, multiple, unexpected, unsupported, oversized, and invalid UTF-8 uploads', async () => {
    const missing = await POST(requestWithFiles([]))
    expect(missing.status).toBe(400)
    await expect(missing.json()).resolves.toEqual({
      kind: 'CATALOG_ONBOARDING_PREFLIGHT_FAILURE',
      code: 'INVALID_CATALOG_PREFLIGHT_INPUT',
    })

    const multiple = await POST(
      requestWithFiles([
        { name: 'one.csv', type: 'text/csv', content: validCsv() },
        { name: 'two.csv', type: 'text/csv', content: validCsv() },
      ])
    )
    expect(multiple.status).toBe(400)

    const unexpected = await POST(
      requestWithFiles(
        [{ name: 'one.csv', type: 'text/csv', content: validCsv() }],
        true
      )
    )
    expect(unexpected.status).toBe(400)

    const unsupportedName = 'private-sheet.txt'
    const unsupported = await POST(
      requestWithFiles([
        { name: unsupportedName, type: 'text/plain', content: validCsv() },
      ])
    )
    expect(unsupported.status).toBe(415)
    const unsupportedBody = await unsupported.json()
    expect(unsupportedBody).toEqual({
      kind: 'CATALOG_ONBOARDING_PREFLIGHT_FAILURE',
      code: 'UNSUPPORTED_CSV_TYPE',
    })
    expect(JSON.stringify(unsupportedBody)).not.toContain(unsupportedName)

    const oversized = await POST(
      requestWithFiles([
        {
          name: 'large.csv',
          type: 'text/csv',
          content: new Uint8Array(MAX_CATALOG_ONBOARDING_CSV_BYTES + 1),
        },
      ])
    )
    expect(oversized.status).toBe(413)

    const invalidUtf8 = await POST(
      requestWithFiles([
        {
          name: 'bad.csv',
          type: 'text/csv',
          content: Uint8Array.from([0xff, 0xfe]),
        },
      ])
    )
    expect(invalidUtf8.status).toBe(422)
    await expect(invalidUtf8.json()).resolves.toEqual({
      kind: 'CATALOG_ONBOARDING_PREFLIGHT_FAILURE',
      code: 'INVALID_CSV_CONTENT',
    })
  })

  it('reports CSV issues without echoing sensitive cells or promoting verified status', async () => {
    const source = [
      CATALOG_ONBOARDING_TEMPLATE_COLUMNS.join(','),
      'product-one,0729000000001,SKU-001,verified,Private Customer Product,,[],true,false,1,12,true',
    ].join('\r\n')
    const response = await POST(
      requestWithFiles([
        { name: 'source-private.csv', type: 'text/csv', content: source },
      ])
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      status: 'NEEDS_CORRECTION',
      sideEffects: {
        imported: false,
        catalogUpdated: false,
        recordsVerified: false,
      },
      issues: [
        {
          rowNumber: 2,
          field: 'verificationStatus',
          code: 'VERIFIED_STATUS_NOT_ALLOWED',
          severity: 'error',
        },
      ],
    })
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('source-private.csv')
    expect(serialized).not.toContain('Private Customer Product')
    expect(serialized).not.toContain('0729000000001')
  })
})
