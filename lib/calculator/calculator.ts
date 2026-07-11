import { Rule } from '../rules/types'
import { CalculationResult, CalculatorInput, Product, Totals } from './types'
import {
  initTotals,
  addToTotals,
  getTotalQuantity,
} from './aggregator'
import {
  validateProduct,
  validateRule,
  validateQuantity,
  addWarning,
} from './validation'

/**
 * Calculate units vs cases for a product
 * @param input Calculator input (sku, productName, quantity)
 * @param rule Rule matched from product name
 * @param product Product data from catalog
 * @returns Calculation result with totals and warnings
 */
export function calculate(
  input: CalculatorInput,
  rule: Rule | null,
  product: Product | null
): CalculationResult {
  const warnings: string[] = []
  const totals = initTotals()

  // Validate inputs
  if (!validateRule(rule, warnings)) {
    return { success: false, totals, warnings }
  }

  if (!validateProduct(product, warnings)) {
    return { success: false, totals, warnings }
  }

  if (!validateQuantity(input.quantity, warnings)) {
    return { success: false, totals, warnings }
  }

  // Rule and product must both allow units
  const allowUnits = rule!.allowUnits && product!.allowUnits

  // Add quantity to appropriate total
  const updatedTotals = addToTotals(totals, input.quantity, allowUnits)

  return {
    success: true,
    totals: updatedTotals,
    warnings,
  }
}

/**
 * Batch calculate multiple products
 * @param inputs Array of calculator inputs
 * @param ruleMap Map of product names to rules
 * @param productMap Map of SKUs to products
 * @returns Aggregated totals and all warnings
 */
export function calculateBatch(
  inputs: CalculatorInput[],
  ruleMap: Map<string, Rule>,
  productMap: Map<string, Product>
): CalculationResult {
  let totals = initTotals()
  const allWarnings: string[] = []

  for (const input of inputs) {
    const rule = ruleMap.get(input.productName) || null
    const product = productMap.get(input.sku) || null

    const result = calculate(input, rule, product)

    totals = {
      units: totals.units + result.totals.units,
      cases: totals.cases + result.totals.cases,
    }

    allWarnings.push(...result.warnings)
  }

  return {
    success: allWarnings.length === 0,
    totals,
    warnings: allWarnings,
  }
}
