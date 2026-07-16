import type { Product } from './types'
import type { Rule } from '../rules/types'

/** Validate that a rule is present; pushes a warning and returns false if not. */
export function validateRule(rule: Rule | null, warnings: string[]): boolean {
  if (!rule) {
    warnings.push('No matching rule found')
    return false
  }
  return true
}

/** Validate that a product is present; pushes a warning and returns false if not. */
export function validateProduct(product: Product | null, warnings: string[]): boolean {
  if (!product) {
    warnings.push('Product not found in catalog')
    return false
  }
  return true
}

/** Validate that a quantity is positive; pushes a warning and returns false if not. */
export function validateQuantity(quantity: number, warnings: string[]): boolean {
  if (quantity <= 0) {
    warnings.push(`Invalid quantity: ${quantity}`)
    return false
  }
  return true
}

/** Append a warning message to the list. */
export function addWarning(warnings: string[], message: string): void {
  warnings.push(message)
}
