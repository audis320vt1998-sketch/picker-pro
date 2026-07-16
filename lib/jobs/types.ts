import type { DomainError } from '@/lib/domain/errors'
import type { Result } from '@/lib/domain/result'
import type { Job, JobStatus } from '@/lib/domain/types'

export interface CreateJobInput {
  sourceFiles: string[]
  createdBy: string
  cityIdOverride?: string
  routeIdOverride?: string
}

export interface JobProgress {
  jobId: string
  status: JobStatus
  processedPages: number
  totalPages: number
  pendingReviewCount: number
}

export type JobResult = Result<Job, DomainError>
export type JobProgressResult = Result<JobProgress, DomainError>
