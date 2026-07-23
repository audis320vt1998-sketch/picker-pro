import { summarizeManualReviewResult } from '@/lib/manual-review/result-summary'

describe('summarizeManualReviewResult', () => {
  it('reports a fully accepted result without excluded rows or warnings', () => {
    expect(
      summarizeManualReviewResult({
        acceptedRowCount: 3,
        totalRowCount: 3,
        issues: [],
      })
    ).toEqual({
      acceptedRowCount: 3,
      totalRowCount: 3,
      excludedRowCount: 0,
      warningCount: 0,
    })
  })

  it('uses accepted and total rows, rather than issue count, for exclusions', () => {
    expect(
      summarizeManualReviewResult({
        acceptedRowCount: 2,
        totalRowCount: 4,
        issues: [
          { severity: 'fail' },
          { severity: 'fail' },
          { severity: 'warn' },
        ],
      })
    ).toEqual({
      acceptedRowCount: 2,
      totalRowCount: 4,
      excludedRowCount: 2,
      warningCount: 1,
    })
  })

  it('does not count an accepted zero-total warning as an excluded row', () => {
    expect(
      summarizeManualReviewResult({
        acceptedRowCount: 1,
        totalRowCount: 1,
        issues: [{ severity: 'warn' }],
      })
    ).toEqual({
      acceptedRowCount: 1,
      totalRowCount: 1,
      excludedRowCount: 0,
      warningCount: 1,
    })
  })
})
