import type { MaayanParseIssue } from './types'

const FIELD_LABELS: Record<NonNullable<MaayanParseIssue['field']>, string> = {
  printedRowNumber: 'מספר שורת המקור',
  sku: 'מק״ט',
  barcode: 'ברקוד',
  productName: 'שם הפריט',
  caseQuantity: 'כמות המארזים',
  unitsPerCase: 'כמות באריזה',
  totalUnits: 'כמות הבודדים',
}

function fieldLabel(field: MaayanParseIssue['field']): string {
  return (field && FIELD_LABELS[field]) ?? 'שדה בשורה'
}

/**
 * Converts a whitelisted OCR parse issue into a fixed UI message. The parser's
 * free-form `message` is intentionally never displayed to the reviewer.
 */
export function documentPreflightRowIssueText(issue: MaayanParseIssue): string {
  switch (issue.code) {
    case 'MISSING_SKU':
      return 'לא זוהה מק״ט. יש לאמת או להזין אותו מול המסמך.'
    case 'MISSING_BARCODE':
      return 'לא זוהה ברקוד. יש לאמת או להזין אותו מול המסמך.'
    case 'MISSING_PRODUCT_NAME':
      return 'לא זוהה שם פריט. יש לאמת או להזין אותו מול המסמך.'
    case 'AMBIGUOUS_NUMERIC_FIELD':
      return `זוהה יותר מערך OCR אפשרי עבור ${fieldLabel(issue.field)}. יש לבדוק מול המסמך.`
    case 'INVALID_NUMERIC_FIELD':
      return `הערך עבור ${fieldLabel(issue.field)} אינו מספר תקין. יש לבדוק מול המסמך.`
  }
}
