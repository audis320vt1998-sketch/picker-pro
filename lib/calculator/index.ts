/**
 * Calculator
 * Performs calculations on extracted data
 */

export interface CalculationResult {
  totalPrice: number
  totalQuantity: number
  averagePrice: number
  itemCount: number
}

export function calculateTotals(
  items: Array<{ price: number; quantity: number }>
): CalculationResult {
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const itemCount = items.length

  return {
    totalPrice,
    totalQuantity,
    averagePrice: itemCount > 0 ? totalPrice / itemCount : 0,
    itemCount,
  }
}