/**
 * Creates a conservative comparison key for catalog product names. It is
 * intentionally limited to presentation variants that OCR commonly mixes in
 * Hebrew/English text; it never transliterates, fuzzily matches, or changes
 * product identifiers.
 */
export function normalizeCatalogProductName(value: string): string {
  return value
    .normalize('NFKC')
    // Keep the Hebrew maqaf (U+05BE) so it can be harmonized as a dash below.
    .replace(/[\u0591-\u05bd\u05bf-\u05c7]/g, '')
    .replace(/[\u05be\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, '-')
    .replace(/[\u05f3\u2018-\u201b\u00b4`]/g, "'")
    .replace(/[\u05f4\u201c-\u201f]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('he')
}
