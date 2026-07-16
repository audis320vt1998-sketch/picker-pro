import type { DomainError } from '@/lib/domain/errors'
import type { Result } from '@/lib/domain/result'
import type {
  ValidationIssue,
  ValidationSeverity,
  ValidationStage,
} from '@/lib/domain/types'

export interface ValidationRule {
  id: string
  stage: ValidationStage
  severity: ValidationSeverity
  description: string
  blocking: boolean
}

export type ValidationResult = Result<ValidationIssue[], DomainError>
