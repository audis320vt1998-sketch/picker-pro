import { normalizeCatalogProductName } from '@/lib/catalog'

describe('normalizeCatalogProductName', () => {
  it('normalizes Hebrew marks, spacing, and maqaf without changing letters', () => {
    expect(normalizeCatalogProductName('  הָאַגָּן־דאז  ')).toBe('האגן-דאז')
  })

  it('normalizes mixed Hebrew/English case and quote variants', () => {
    expect(normalizeCatalogProductName(' Little  Moons  מוצ’י ')).toBe(
      "little moons מוצ'י"
    )
    expect(normalizeCatalogProductName('מ״ל גר׳')).toBe('מ"ל גר\'')
  })
})
