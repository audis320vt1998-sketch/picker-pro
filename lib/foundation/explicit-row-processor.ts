import {
  type ProductResolutionMethod,
  type VerifiedCatalogProduct,
  VerifiedProductCatalog,
} from '@/lib/catalog/verified-catalog'
import type {
  ParsedRow,
  ProductIdentity,
  ProductResolvedBy,
  ProductTotals,
  ValidationIssue,
} from '@/lib/domain/types'
import type { SourceReference } from '@/lib/traceability/types'
import { aggregateProductTotals } from './aggregate-product-totals'
import { allowsIndividualUnitPicking } from '@/lib/catalog/picking-policy'

export interface ExplicitRowProcessingResult {
  totals: ProductTotals[]
  issues: ValidationIssue[]
  acceptedRowCount: number
  totalRowCount: number
}

interface Quantities {
  cases: number
  units: number
}

const RESOLUTION_METHOD_TO_IDENTITY: Record<
  ProductResolutionMethod,
  ProductResolvedBy
> = {
  barcode: 'barcode',
  sku: 'sku',
  canonical_name: 'name',
  alias: 'alias',
}

function createIssue(
  row: ParsedRow,
  code: string,
  message: string,
  productKey?: string
): ValidationIssue {
  return {
    code,
    message,
    severity: 'fail',
    stage: 'row',
    source: row.source,
    ...(productKey ? { productKey } : {}),
  }
}

function createWarningIssue(
  row: ParsedRow,
  code: string,
  message: string,
  productKey: string
): ValidationIssue {
  return {
    code,
    message,
    severity: 'warn',
    stage: 'row',
    source: row.source,
    productKey,
  }
}

function hasTraceableSource(source: SourceReference | undefined): boolean {
  return Boolean(
    source &&
      typeof source.page?.jobId === 'string' &&
      source.page.jobId.trim().length > 0 &&
      Number.isInteger(source.page.pageNumber) &&
      source.page.pageNumber > 0 &&
      Number.isInteger(source.row?.rowNumber) &&
      source.row.rowNumber > 0
  )
}

function isValidQuantity(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

function isPositiveCaseSize(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function getValidQuantities(row: ParsedRow): Quantities | null {
  if (!isValidQuantity(row.cases) || !isValidQuantity(row.units)) {
    return null
  }

  return {
    cases: row.cases,
    units: row.units,
  }
}

function productIdentity(
  product: VerifiedCatalogProduct,
  resolutionMethod: ProductResolutionMethod
): ProductIdentity {
  return {
    productKey: product.productKey,
    ...(product.barcode ? { barcode: product.barcode } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    name: product.name,
    resolvedBy: RESOLUTION_METHOD_TO_IDENTITY[resolutionMethod],
  }
}

function createRowTotal(
  row: ParsedRow,
  product: ProductIdentity,
  quantities: Quantities
): ProductTotals {
  return {
    product,
    cases: {
      value: quantities.cases,
      sources: [row.source],
    },
    units: {
      value: quantities.units,
      sources: [row.source],
    },
  }
}

function createZeroTotalIssue(total: ProductTotals): ValidationIssue {
  return {
    code: 'ZERO_TOTAL',
    message: 'The product has explicit source rows but both aggregated totals are zero.',
    severity: 'warn',
    stage: 'aggregate',
    productKey: total.product.productKey,
  }
}

/**
 * Processes rows whose cases and individual units were read from explicit
 * source columns. It deliberately performs no pack-size conversion, remainder
 * calculation, or name-based unit inference.
 */
export function processExplicitRows(
  rows: readonly ParsedRow[],
  catalog: VerifiedProductCatalog
): ExplicitRowProcessingResult {
  const acceptedTotals: ProductTotals[] = []
  const issues: ValidationIssue[] = []

  for (const row of rows) {
    if (!hasTraceableSource(row.source)) {
      issues.push(
        createIssue(
          row,
          'TRACEABILITY_MISSING',
          'A source page and row reference are required before a quantity can be aggregated.'
        )
      )
      continue
    }

    const quantities = getValidQuantities(row)
    if (!quantities) {
      issues.push(
        createIssue(
          row,
          'INVALID_QUANTITY',
          'Cases and individual units must be non-negative finite values from explicit source fields.'
        )
      )
      continue
    }

    const resolution = catalog.resolve({
      barcode: row.barcode,
      sku: row.sku,
      productName: row.productHint,
    })

    if (resolution.status === 'unresolved') {
      issues.push(
        createIssue(
          row,
          'PRODUCT_UNRESOLVED',
          'The row could not be matched to a verified catalog record.'
        )
      )
      continue
    }

    if (resolution.status === 'conflict') {
      issues.push(
        createIssue(
          row,
          'PRODUCT_CONFLICT',
          'The supplied product identifiers point to more than one catalog record.'
        )
      )
      continue
    }

    if (resolution.status === 'unverified') {
      issues.push(
        createIssue(
          row,
          'PRODUCT_UNVERIFIED',
          'The catalog match exists but has not been verified for operational use.',
          resolution.product.productKey
        )
      )
      continue
    }

    const product = resolution.product
    if (quantities.units > 0 && !allowsIndividualUnitPicking(product)) {
      issues.push(
        createIssue(
          row,
          'UNIT_TYPE_ENFORCEMENT',
          'The verified catalog record does not permit individual-unit picking for this product.',
          product.productKey
        )
      )
      continue
    }

    if (
      allowsIndividualUnitPicking(product) &&
      isPositiveCaseSize(product.caseSize) &&
      quantities.units >= product.caseSize
    ) {
      issues.push(
        createWarningIssue(
          row,
          'UNITS_AT_OR_ABOVE_CASE_SIZE',
          'The explicit individual-unit quantity reaches or exceeds the verified catalog case size; confirm it before picking.',
          product.productKey
        )
      )
    }

    acceptedTotals.push(
      createRowTotal(
        row,
        productIdentity(product, resolution.resolvedBy),
        quantities
      )
    )
  }

  const totals = aggregateProductTotals(acceptedTotals)
  for (const total of totals) {
    if (total.cases.value === 0 && total.units.value === 0) {
      issues.push(createZeroTotalIssue(total))
    }
  }

  return {
    totals,
    issues,
    acceptedRowCount: acceptedTotals.length,
    totalRowCount: rows.length,
  }
}
