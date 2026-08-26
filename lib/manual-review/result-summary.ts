import type { ValidationIssue } from '@/lib/domain/types'

export interface ManualReviewResultSummary {
  acceptedRowCount: number
  totalRowCount: number
  excludedRowCount: number
  warningCount: number
}

interface ManualReviewResultSummaryInput {
  acceptedRowCount: number
  totalRowCount: number
  issues: readonly Pick<ValidationIssue, 'severity'>[]
}

/**
 * Separates rows that were excluded from operational totals from warnings on
 * rows that may already have been accepted. This deliberately never infers a
 * row count from the number of issues.
 */
export function summarizeManualReviewResult({
  acceptedRowCount,
  totalRowCount,
  issues,
}: ManualReviewResultSummaryInput): ManualReviewResultSummary {
  return {
    acceptedRowCount,
    totalRowCount,
    excludedRowCount: totalRowCount - acceptedRowCount,
    warningCount: issues.filter((issue) => issue.severity === 'warn').length,
  }
}
