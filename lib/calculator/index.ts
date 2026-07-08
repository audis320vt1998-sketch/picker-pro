/**
 * Calculator Utilities
 * Performs calculations on extracted data
 */

export interface CalculationResult {
  totalPrice: number
  totalQuantity: number
  averagePrice: number
  itemCount: number
  minPrice: number
  maxPrice: number
}

export interface PriceWithTax {
  subtotal: number
  tax: number
  total: number
  taxRate: number
}

export interface DiscountCalculation {
  originalPrice: number
  discountAmount: number
  discountPercentage: number
  finalPrice: number
}

/**
 * Calculate totals, averages, and statistics for items
 * @param items Array of items with price and quantity
 * @returns Comprehensive calculation results
 */
export function calculateTotals(
  items: Array<{ price: number; quantity: number }>
): CalculationResult {
  if (items.length === 0) {
    return {
      totalPrice: 0,
      totalQuantity: 0,
      averagePrice: 0,
      itemCount: 0,
      minPrice: 0,
      maxPrice: 0,
    }
  }

  const prices = items.map((item) => item.price)
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const itemCount = items.length

  return {
    totalPrice,
    totalQuantity,
    averagePrice: itemCount > 0 ? totalPrice / itemCount : 0,
    itemCount,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
  }
}

/**
 * Calculate price with tax
 * @param price Base price
 * @param taxRate Tax rate as percentage (e.g., 10 for 10%)
 * @returns Object with subtotal, tax, total, and tax rate
 */
export function calculateWithTax(
  price: number,
  taxRate: number = 0
): PriceWithTax {
  const taxAmount = price * (taxRate / 100)
  return {
    subtotal: price,
    tax: Math.round(taxAmount * 100) / 100,
    total: Math.round((price + taxAmount) * 100) / 100,
    taxRate,
  }
}

/**
 * Calculate discount on a price
 * @param originalPrice Original price
 * @param discountPercentage Discount percentage (e.g., 20 for 20%)
 * @returns Object with original price, discount amount, and final price
 */
export function calculateDiscount(
  originalPrice: number,
  discountPercentage: number
): DiscountCalculation {
  const discountAmount = originalPrice * (discountPercentage / 100)
  return {
    originalPrice,
    discountAmount: Math.round(discountAmount * 100) / 100,
    discountPercentage,
    finalPrice: Math.round((originalPrice - discountAmount) * 100) / 100,
  }
}

/**
 * Calculate price with both tax and discount
 * @param price Base price
 * @param discountPercentage Discount percentage
 * @param taxRate Tax rate as percentage
 * @returns Final price after discount and tax
 */
export function calculateFinalPrice(
  price: number,
  discountPercentage: number = 0,
  taxRate: number = 0
): number {
  const discounted = calculateDiscount(price, discountPercentage)
  const withTax = calculateWithTax(discounted.finalPrice, taxRate)
  return withTax.total
}

/**
 * Calculate statistics for an array of prices
 * @param prices Array of prices
 * @returns Object with min, max, average, median, and sum
 */
export function calculatePriceStatistics(
  prices: number[]
): {
  min: number
  max: number
  average: number
  median: number
  sum: number
  count: number
} {
  if (prices.length === 0) {
    return {
      min: 0,
      max: 0,
      average: 0,
      median: 0,
      sum: 0,
      count: 0,
    }
  }

  const sorted = [...prices].sort((a, b) => a - b)
  const sum = prices.reduce((acc, price) => acc + price, 0)
  const average = sum / prices.length
  const median =
    prices.length % 2 === 0
      ? (sorted[prices.length / 2 - 1] + sorted[prices.length / 2]) / 2
      : sorted[Math.floor(prices.length / 2)]

  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: Math.round(average * 100) / 100,
    median,
    sum: Math.round(sum * 100) / 100,
    count: prices.length,
  }
}

/**
 * Round price to nearest cent
 * @param price Price to round
 * @returns Rounded price
 */
export function roundPrice(price: number): number {
  return Math.round(price * 100) / 100
}

/**
 * Format price as currency string
 * @param price Price to format
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(
  price: number,
  currency: string = 'USD'
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price)
}
