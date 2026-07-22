import { preflightCatalogOnboardingCsv } from '@/lib/catalog/onboarding-preflight'
import { CATALOG_ONBOARDING_TEMPLATE_COLUMNS } from '@/lib/catalog/onboarding-template'
import {
  MAX_CATALOG_ONBOARDING_CELL_CHARACTERS,
  type CatalogOnboardingTemplateColumn,
} from '@/lib/catalog/onboarding-preflight-policy'

type CsvRow = Record<CatalogOnboardingTemplateColumn, string>

function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

function validRow(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    productKey: 'product-one',
    barcode: '0729000000001',
    sku: 'SKU-001',
    verificationStatus: 'unverified',
    name: 'Product One',
    nameEn: '',
    aliases: '[]',
    allowUnitPicking: 'true',
    caseOnly: 'false',
    unitSize: '1',
    caseSize: '12',
    active: 'true',
    ...overrides,
  }
}

function csv(rows: readonly CsvRow[], bom = false): string {
  const header = CATALOG_ONBOARDING_TEMPLATE_COLUMNS.join(',')
  const body = rows
    .map((row) =>
      CATALOG_ONBOARDING_TEMPLATE_COLUMNS.map((column) =>
        escapeCsvCell(row[column])
      ).join(',')
    )
    .join('\r\n')

  return `${bom ? '\uFEFF' : ''}${header}\r\n${body}${body ? '\r\n' : ''}`
}

describe('catalog onboarding CSV preflight', () => {
  it('accepts a quoted UTF-8 BOM CSV only as ready for controlled review', () => {
    const result = preflightCatalogOnboardingCsv(
      csv([validRow({ aliases: '["Alias, One"]' })], true)
    )

    expect(result).toEqual({
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
  })

  it('requires every candidate to remain unverified until a controlled update', () => {
    const result = preflightCatalogOnboardingCsv(
      csv([validRow({ verificationStatus: 'verified' })])
    )

    expect(result.status).toBe('NEEDS_CORRECTION')
    expect(result.summary).toMatchObject({
      totalRows: 1,
      readyRows: 0,
      rowsWithErrors: 1,
    })
    expect(result.issues).toContainEqual({
      rowNumber: 2,
      field: 'verificationStatus',
      code: 'VERIFIED_STATUS_NOT_ALLOWED',
      severity: 'error',
    })
  })

  it('reports structural CSV and field issues without returning source cells', () => {
    const malformed = preflightCatalogOnboardingCsv(
      `${CATALOG_ONBOARDING_TEMPLATE_COLUMNS.join(',')}\r\n"unterminated`
    )
    expect(malformed).toMatchObject({
      status: 'NEEDS_CORRECTION',
      issues: [
        {
          rowNumber: null,
          field: null,
          code: 'INVALID_CSV',
        },
      ],
    })

    const invalidAliases = preflightCatalogOnboardingCsv(
      csv([validRow({ aliases: '{"not":"an array"}', name: 'Private Product' })])
    )
    expect(invalidAliases.issues).toContainEqual({
      rowNumber: 2,
      field: 'aliases',
      code: 'INVALID_ALIASES',
      severity: 'error',
    })
    expect(JSON.stringify(invalidAliases)).not.toContain('Private Product')
  })

  it('rejects internal blank records, oversized cells, and header-only files', () => {
    const blankRecord = preflightCatalogOnboardingCsv(
      `${csv([validRow()])}\r\n`
    )
    expect(blankRecord.summary).toMatchObject({ totalRows: 2, rowsWithErrors: 1 })
    expect(blankRecord.issues).toContainEqual({
      rowNumber: 3,
      field: null,
      code: 'EMPTY_PRODUCT_ROW',
      severity: 'error',
    })

    const tooLarge = preflightCatalogOnboardingCsv(
      csv([validRow({ name: 'x'.repeat(MAX_CATALOG_ONBOARDING_CELL_CHARACTERS + 1) })])
    )
    expect(tooLarge.issues).toContainEqual({
      rowNumber: 2,
      field: 'name',
      code: 'CELL_TOO_LARGE',
      severity: 'error',
    })

    const headerOnly = preflightCatalogOnboardingCsv(csv([]))
    expect(headerOnly.issues).toContainEqual({
      rowNumber: null,
      field: null,
      code: 'NO_PRODUCT_ROWS',
      severity: 'error',
    })
  })

  it('marks both sides of duplicate identifiers and ignores blank identifiers', () => {
    const duplicated = preflightCatalogOnboardingCsv(
      csv([
        validRow({ barcode: ' 0729000000001 ' }),
        validRow({ productKey: 'product-two', sku: 'SKU-002' }),
      ])
    )

    expect(duplicated.summary).toMatchObject({ rowsWithErrors: 2, readyRows: 0 })
    expect(
      duplicated.issues.filter((issue) => issue.code === 'DUPLICATE_BARCODE')
    ).toHaveLength(2)

    const blankIdentifiers = preflightCatalogOnboardingCsv(
      csv([
        validRow({ barcode: '', sku: '' }),
        validRow({ productKey: 'product-two', barcode: '', sku: '' }),
      ])
    )
    expect(blankIdentifiers.status).toBe('READY_FOR_CONTROLLED_REVIEW')
  })

  it('rejects a candidate that is both case-only and enabled for unit picking', () => {
    const result = preflightCatalogOnboardingCsv(
      csv([validRow({ caseOnly: 'true', allowUnitPicking: 'true' })])
    )

    expect(result.status).toBe('NEEDS_CORRECTION')
    expect(result.issues).toContainEqual({
      rowNumber: 2,
      field: 'caseOnly',
      code: 'CONTRADICTORY_PICKING_CONFIGURATION',
      severity: 'error',
    })
  })
})
