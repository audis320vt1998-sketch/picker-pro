import { NextRequest, NextResponse } from 'next/server'
import { loadVerifiedCatalog } from '@/lib/catalog'
import type { MaayanRawQuantities } from '@/lib/document-intake'
import { loadPickingRuleConfiguration } from '@/lib/manual-review/picking-rule-config'
import {
  getPackingSuggestion,
  type PackingSuggestionInput,
} from '@/lib/manual-review/packing-suggestion'

const ALLOWED_FIELDS = new Set([
  'productName',
  'barcode',
  'sku',
  'sourceQuantities',
])
const SOURCE_QUANTITY_FIELDS = new Set([
  'caseQuantity',
  'unitsPerCase',
  'totalUnits',
])
const MAX_PRODUCT_NAME_LENGTH = 512
const MAX_IDENTIFIER_LENGTH = 128

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function optionalIdentifier(
  value: Record<string, unknown>,
  field: 'productName' | 'barcode' | 'sku',
  maxLength: number
): string | undefined {
  const candidate = value[field]
  if (candidate === undefined) {
    return undefined
  }

  if (typeof candidate !== 'string' || candidate.length > maxLength) {
    return undefined
  }

  const cleaned = candidate.trim()
  return cleaned || undefined
}

function isSourceQuantity(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

function sourceQuantities(value: unknown): MaayanRawQuantities | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((field) => !SOURCE_QUANTITY_FIELDS.has(field)) ||
    ![...SOURCE_QUANTITY_FIELDS].every((field) => isSourceQuantity(value[field]))
  ) {
    return null
  }

  return {
    caseQuantity: value.caseQuantity as number | null,
    unitsPerCase: value.unitsPerCase as number | null,
    totalUnits: value.totalUnits as number | null,
  }
}

function parseInput(value: unknown): PackingSuggestionInput | null {
  if (
    !isRecord(value) ||
    Object.keys(value).some((field) => !ALLOWED_FIELDS.has(field)) ||
    (value.productName !== undefined &&
      (typeof value.productName !== 'string' ||
        value.productName.length > MAX_PRODUCT_NAME_LENGTH)) ||
    (value.barcode !== undefined &&
      (typeof value.barcode !== 'string' || value.barcode.length > MAX_IDENTIFIER_LENGTH)) ||
    (value.sku !== undefined &&
      (typeof value.sku !== 'string' || value.sku.length > MAX_IDENTIFIER_LENGTH))
  ) {
    return null
  }

  const parsedQuantities = sourceQuantities(value.sourceQuantities)
  if (!parsedQuantities) {
    return null
  }

  const productName = optionalIdentifier(
    value,
    'productName',
    MAX_PRODUCT_NAME_LENGTH
  )
  const barcode = optionalIdentifier(value, 'barcode', MAX_IDENTIFIER_LENGTH)
  const sku = optionalIdentifier(value, 'sku', MAX_IDENTIFIER_LENGTH)

  return {
    ...(productName ? { productName } : {}),
    ...(barcode ? { barcode } : {}),
    ...(sku ? { sku } : {}),
    sourceQuantities: parsedQuantities,
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noStoreJson(
      {
        error: 'Packing suggestion input is invalid.',
        code: 'INVALID_PACKING_SUGGESTION_INPUT',
      },
      400
    )
  }

  const input = parseInput(body)
  if (!input) {
    return noStoreJson(
      {
        error: 'Packing suggestion input is invalid.',
        code: 'INVALID_PACKING_SUGGESTION_INPUT',
      },
      400
    )
  }

  try {
    const { catalog } = loadVerifiedCatalog()
    const configuration = loadPickingRuleConfiguration()
    return noStoreJson({
      kind: 'PACKING_SUGGESTION',
      ...getPackingSuggestion(input, catalog, configuration),
    })
  } catch {
    return noStoreJson(
      {
        error: 'Packing suggestion service is unavailable.',
        code: 'PACKING_SUGGESTION_UNAVAILABLE',
      },
      503
    )
  }
}
