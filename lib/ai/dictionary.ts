/** Common OCR character substitutions (e.g. letter O → digit 0). */
const CHARACTER_MAP: Record<string, string> = {
  O: '0',
  I: '1',
  l: '1',
  S: '5',
  B: '8',
}

/** Fix common single-character OCR errors. */
export function fixCharacterErrors(text: string): string {
  return text.replace(/[OIlSB]/g, (c) => CHARACTER_MAP[c] ?? c)
}

/** Look up a known correction in the dictionary. Returns null if not found. */
export function lookupCorrection(_text: string): string | null {
  return null
}
