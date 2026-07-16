import type { AppConfig } from '@/lib/config'
import type { DomainError } from '@/lib/domain/errors'
import type { Result } from '@/lib/domain/result'
import type {
  Job,
  ParsedRow,
  ProductIdentity,
  ProductTotals,
  ReviewItem,
  SourcePage,
  ValidationIssue,
} from '@/lib/domain/types'

export interface ServiceContext {
  config: AppConfig
  job: Job
}

export interface ParserService {
  parsePage(page: SourcePage): Promise<Result<ParsedRow[], DomainError>>
}

export interface ProductResolverService {
  resolveRow(row: ParsedRow): Promise<Result<ProductIdentity, DomainError>>
}

export interface CalculatorService {
  calculateTotals(
    row: ParsedRow,
    product: ProductIdentity
  ): Promise<Result<ProductTotals, DomainError>>
}

export interface ValidationService {
  validateRow(row: ParsedRow): Result<ValidationIssue[], DomainError>
  validateTotals(totals: ProductTotals): Result<ValidationIssue[], DomainError>
}

export interface ReviewQueueService {
  enqueue(issue: ValidationIssue): Promise<Result<ReviewItem, DomainError>>
}

export interface AggregatorService {
  aggregate(totals: ProductTotals[]): Result<ProductTotals[], DomainError>
}
