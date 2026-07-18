/** Validate an EAN-13 barcode checksum. */
export function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false
  const digits = barcode.split('').map(Number)
  const check = digits[12]
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === check
}

/** Attempt to correct a near-valid EAN-13 by fixing the check digit. */
export function correctEAN13(barcode: string): string | null {
  if (!/^\d{13}$/.test(barcode)) return null
  const digits = barcode.split('').map(Number)
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  const correct = (10 - (sum % 10)) % 10
  return barcode.slice(0, 12) + correct
}
