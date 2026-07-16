export interface CatalogEntry {
  sku: string
  barcode: string
  name: string
  packSize: number
  allowUnits: boolean
  category?: string
  supplier?: string
  price?: number
}
