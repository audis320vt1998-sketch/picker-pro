import type { DomainError } from '@/lib/domain/errors'

export type Ok<T> = {
  ok: true
  value: T
}

export type Err<E extends DomainError = DomainError> = {
  ok: false
  error: E
}

export type Result<T, E extends DomainError = DomainError> = Ok<T> | Err<E>

export function ok<T>(value: T): Ok<T> {
  return {
    ok: true,
    value,
  }
}

export function err<E extends DomainError>(error: E): Err<E> {
  return {
    ok: false,
    error,
  }
}

export function isOk<T, E extends DomainError>(
  result: Result<T, E>
): result is Ok<T> {
  return result.ok
}

export function isErr<T, E extends DomainError>(
  result: Result<T, E>
): result is Err<E> {
  return !result.ok
}

export function mapResult<T, U, E extends DomainError>(
  result: Result<T, E>,
  mapper: (value: T) => U
): Result<U, E> {
  return result.ok ? ok(mapper(result.value)) : result
}

export function mapError<T, E extends DomainError, F extends DomainError>(
  result: Result<T, E>,
  mapper: (error: E) => F
): Result<T, F> {
  return result.ok ? result : err(mapper(result.error))
}
