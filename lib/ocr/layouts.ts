/**
 * OCR Region Configuration
 * Define text extraction regions for picking lists
 */

export interface Region {
  name: string
  label: string
  xMin: number
  xMax: number
  yMin?: number
  yMax?: number
  type: 'sku' | 'name' | 'barcode' | 'quantity' | 'custom'
}

export interface PickingListLayout {
  id: string
  name: string
  language: 'en' | 'he' | 'mixed'
  regions: Region[]
  pageWidth?: number
  pageHeight?: number
  description: string
}

/**
 * Hebrew Picking List Layout
 * Standard layout for Hebrew picking documents
 */
export const HEBREW_LAYOUT: PickingListLayout = {
  id: 'hebrew_standard',
  name: 'Hebrew Standard Layout',
  language: 'he',
  description: 'Standard Hebrew picking list with SKU, product name, barcode, and quantity',
  pageWidth: 1200,
  pageHeight: 1600,
  regions: [
    {
      name: 'sku',
      label: 'אזור מק"ט (SKU Region)',
      xMin: 60,
      xMax: 120,
      type: 'sku'
    },
    {
      name: 'productName',
      label: 'אזור שם מוצר (Product Name Region)',
      xMin: 250,
      xMax: 700,
      type: 'name'
    },
    {
      name: 'barcode',
      label: 'אזור ברקוד (Barcode Region)',
      xMin: 720,
      xMax: 900,
      type: 'barcode'
    },
    {
      name: 'quantity',
      label: 'אזור כמות (Quantity Region)',
      xMin: 980,
      xMax: 1040,
      type: 'quantity'
    }
  ]
}

/**
 * English Picking List Layout
 */
export const ENGLISH_LAYOUT: PickingListLayout = {
  id: 'english_standard',
  name: 'English Standard Layout',
  language: 'en',
  description: 'Standard English picking list',
  pageWidth: 1200,
  pageHeight: 1600,
  regions: [
    {
      name: 'sku',
      label: 'SKU Region',
      xMin: 60,
      xMax: 120,
      type: 'sku'
    },
    {
      name: 'productName',
      label: 'Product Name Region',
      xMin: 250,
      xMax: 700,
      type: 'name'
    },
    {
      name: 'barcode',
      label: 'Barcode Region',
      xMin: 720,
      xMax: 900,
      type: 'barcode'
    },
    {
      name: 'quantity',
      label: 'Quantity Region',
      xMin: 980,
      xMax: 1040,
      type: 'quantity'
    }
  ]
}

/**
 * Get layout by ID
 */
export function getLayout(layoutId: string): PickingListLayout {
  const layouts: Record<string, PickingListLayout> = {
    [HEBREW_LAYOUT.id]: HEBREW_LAYOUT,
    [ENGLISH_LAYOUT.id]: ENGLISH_LAYOUT
  }

  const layout = layouts[layoutId]
  if (!layout) {
    throw new Error(`Layout not found: ${layoutId}`)
  }

  return layout
}

/**
 * Get default layout by language
 */
export function getLayoutByLanguage(language: 'en' | 'he'): PickingListLayout {
  return language === 'he' ? HEBREW_LAYOUT : ENGLISH_LAYOUT
}

/**
 * List all available layouts
 */
export function listLayouts(): PickingListLayout[] {
  return [HEBREW_LAYOUT, ENGLISH_LAYOUT]
}
