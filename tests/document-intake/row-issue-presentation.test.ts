import {
  documentPreflightRowIssueText,
  type MaayanParseIssue,
} from '@/lib/document-intake'

describe('documentPreflightRowIssueText', () => {
  it.each([
    [
      { code: 'MISSING_SKU', field: 'sku' },
      'לא זוהה מק״ט. יש לאמת או להזין אותו מול המסמך.',
    ],
    [
      { code: 'MISSING_BARCODE', field: 'barcode' },
      'לא זוהה ברקוד. יש לאמת או להזין אותו מול המסמך.',
    ],
    [
      { code: 'MISSING_PRODUCT_NAME', field: 'productName' },
      'לא זוהה שם פריט. יש לאמת או להזין אותו מול המסמך.',
    ],
    [
      { code: 'AMBIGUOUS_NUMERIC_FIELD', field: 'caseQuantity' },
      'זוהה יותר מערך OCR אפשרי עבור כמות המארזים. יש לבדוק מול המסמך.',
    ],
    [
      { code: 'INVALID_NUMERIC_FIELD', field: 'totalUnits' },
      'הערך עבור כמות הבודדים אינו מספר תקין. יש לבדוק מול המסמך.',
    ],
    [
      { code: 'LOW_FIELD_CONFIDENCE', field: 'barcode' },
      'ודאות ה־OCR עבור ברקוד נמוכה. נדרש אימות מול המסמך.',
    ],
  ] as const)(
    'returns a fixed Hebrew message for %o',
    (issue, expected) => {
      expect(
        documentPreflightRowIssueText({
          ...issue,
          message: 'server text must never be rendered',
        } as MaayanParseIssue)
      ).toBe(expected)
    }
  )

  it('never uses the parser message as UI content', () => {
    const text = documentPreflightRowIssueText({
      code: 'INVALID_NUMERIC_FIELD',
      field: 'unitsPerCase',
      message: 'private OCR message',
    })

    expect(text).not.toContain('private OCR message')
  })
})
