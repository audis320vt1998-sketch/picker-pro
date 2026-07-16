import type { CalculatedValue, SourceReference } from '@/lib/traceability/types'

export type JobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'VALIDATED'
  | 'PARTIAL'
  | 'COMPLETE'
  | 'FAILED'

export interface Job {
  id: string
  status: JobStatus
  createdAt: string
  updatedAt: string
  createdBy: string
  rulesVersion: string
  sourcePages: SourcePage[]
  cityIdOverride?: string
  routeIdOverride?: string
}

export interface SourcePage {
  jobId: string
  pageNumber: number
  imageRef: string
  rows: SourceRow[]
}

export interface SourceRow {
  jobId: string
  pageNumber: number
  rowNumber: number
  rawText: string
  confidence: number
}

export type ProductResolvedBy = 'barcode' | 'sku' | 'name' | 'alias'

export interface ProductIdentity {
  productKey: string
  barcode?: string
  sku?: string
  name: string
  resolvedBy: ProductResolvedBy
}

export interface ParsedRow {
  source: SourceReference
  rawText: string
  productHint: string
  barcode?: string
  sku?: string
  cases: number
  units: number
}

export interface ProductTotals {
  product: ProductIdentity
  cases: CalculatedValue
  units: CalculatedValue
}

export interface City {
  cityId: string
  name: string
  nameEn?: string
  active: boolean
}

export interface DeliveryRoute {
  routeId: string
  cityId: string
  name: string
  nameEn?: string
  sortOrder: number
  active: boolean
}

export type ValidationSeverity = 'warn' | 'fail'
export type ValidationStage = 'row' | 'aggregate'

export interface ValidationIssue {
  code: string
  message: string
  severity: ValidationSeverity
  stage: ValidationStage
  source?: SourceReference
  productKey?: string
}

export type ReviewStatus = 'pending' | 'approved' | 'corrected' | 'rejected'

export interface ReviewItem {
  jobId: string
  itemId: string
  issue: ValidationIssue
  status: ReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  correction?: Partial<ParsedRow>
}
