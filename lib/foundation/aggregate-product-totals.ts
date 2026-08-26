import type { CalculatedValue } from '@/lib/traceability/types'
import type { ProductTotals } from '@/lib/domain/types'

function copyCalculatedValue(value: CalculatedValue): CalculatedValue {
  return {
    value: value.value,
    sources: [...value.sources],
  }
}

function copyProductTotal(total: ProductTotals): ProductTotals {
  return {
    product: { ...total.product },
    cases: copyCalculatedValue(total.cases),
    units: copyCalculatedValue(total.units),
  }
}

/**
 * Merges already-resolved product totals by product key. Case quantities and
 * individual-unit quantities remain independent values and retain their own
 * source references.
 */
export function aggregateProductTotals(
  totals: readonly ProductTotals[]
): ProductTotals[] {
  const totalsByProductKey = new Map<string, ProductTotals>()

  for (const total of totals) {
    const existing = totalsByProductKey.get(total.product.productKey)

    if (!existing) {
      totalsByProductKey.set(total.product.productKey, copyProductTotal(total))
      continue
    }

    existing.cases.value += total.cases.value
    existing.cases.sources.push(...total.cases.sources)
    existing.units.value += total.units.value
    existing.units.sources.push(...total.units.sources)
  }

  return [...totalsByProductKey.values()]
}
