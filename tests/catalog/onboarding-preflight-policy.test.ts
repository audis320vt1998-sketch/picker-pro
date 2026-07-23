import {
  isCatalogOnboardingPreflightResult,
  MAX_CATALOG_ONBOARDING_ISSUES,
  type CatalogOnboardingPreflightResult,
} from '@/lib/catalog/onboarding-preflight-policy'

function validResult(): CatalogOnboardingPreflightResult {
  return {
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
  }
}

const errorIssue = {
  code: 'MISSING_PRODUCT_NAME' as const,
  field: 'name' as const,
  rowNumber: 2,
  severity: 'error' as const,
}

describe('catalog onboarding preflight response policy', () => {
  it('accepts a bounded, internally consistent ready result', () => {
    expect(isCatalogOnboardingPreflightResult(validResult())).toBe(true)
  })

  it('rejects an unbounded issue list or inconsistent truncation flag', () => {
    const tooManyIssues = {
      ...validResult(),
      status: 'NEEDS_CORRECTION' as const,
      summary: {
        totalRows: MAX_CATALOG_ONBOARDING_ISSUES + 1,
        readyRows: 0,
        rowsWithErrors: MAX_CATALOG_ONBOARDING_ISSUES + 1,
        rowsWithWarnings: 0,
      },
      issues: Array.from(
        { length: MAX_CATALOG_ONBOARDING_ISSUES + 1 },
        () => errorIssue
      ),
      issuesTruncated: true,
    }
    const inconsistentTruncation = {
      ...tooManyIssues,
      issues: [errorIssue],
    }

    expect(isCatalogOnboardingPreflightResult(tooManyIssues)).toBe(false)
    expect(isCatalogOnboardingPreflightResult(inconsistentTruncation)).toBe(false)
  })

  it('rejects summary counts that exceed the reported number of product rows', () => {
    const result = {
      ...validResult(),
      summary: {
        totalRows: 1,
        readyRows: 2,
        rowsWithErrors: 0,
        rowsWithWarnings: 0,
      },
    }

    expect(isCatalogOnboardingPreflightResult(result)).toBe(false)
  })

  it('rejects a ready response that carries an error or incomplete summary', () => {
    const withError = {
      ...validResult(),
      issues: [errorIssue],
    }
    const incompleteReadySummary = {
      ...validResult(),
      summary: {
        totalRows: 2,
        readyRows: 1,
        rowsWithErrors: 0,
        rowsWithWarnings: 0,
      },
    }

    expect(isCatalogOnboardingPreflightResult(withError)).toBe(false)
    expect(isCatalogOnboardingPreflightResult(incompleteReadySummary)).toBe(false)
  })

  it('rejects an empty correction response but accepts a global error', () => {
    const emptyCorrection = {
      ...validResult(),
      status: 'NEEDS_CORRECTION' as const,
    }
    const globalError = {
      ...emptyCorrection,
      summary: {
        totalRows: 0,
        readyRows: 0,
        rowsWithErrors: 0,
        rowsWithWarnings: 0,
      },
      issues: [
        {
          code: 'INVALID_HEADER',
          field: null,
          rowNumber: null,
          severity: 'error',
        },
      ],
    }

    expect(isCatalogOnboardingPreflightResult(emptyCorrection)).toBe(false)
    expect(isCatalogOnboardingPreflightResult(globalError)).toBe(true)
  })

  it('accepts the fixed picking-configuration issue code', () => {
    const result = {
      ...validResult(),
      status: 'NEEDS_CORRECTION' as const,
      summary: {
        totalRows: 1,
        readyRows: 0,
        rowsWithErrors: 1,
        rowsWithWarnings: 0,
      },
      issues: [
        {
          code: 'CONTRADICTORY_PICKING_CONFIGURATION',
          field: 'caseOnly',
          rowNumber: 2,
          severity: 'error',
        },
      ],
    }

    expect(isCatalogOnboardingPreflightResult(result)).toBe(true)
  })
})
