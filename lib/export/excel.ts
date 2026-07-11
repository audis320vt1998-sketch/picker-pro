/**
 * Excel Export
 * Exports picking list data to Excel format
 */

import ExcelJS from 'exceljs'

export interface ProductSummary {
  sku: string
  barcode: string
  name: string
  cases: number
  units: number
}

/**
 * Export product summary to Excel workbook
 * @param rows Product summary rows to export
 * @returns Excel workbook buffer
 */
export async function exportToExcel(rows: ProductSummary[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  const sheet = workbook.addWorksheet('רשימת ליקוט')

  sheet.columns = [
    { header: 'מק״ט', key: 'sku', width: 12 },
    { header: 'ברקוד', key: 'barcode', width: 18 },
    { header: 'מוצר', key: 'name', width: 50 },
    { header: 'מארזים', key: 'cases', width: 12 },
    { header: 'בודדים', key: 'units', width: 12 },
  ]

  // Add rows
  rows.forEach((row) => sheet.addRow(row))

  // Format header row
  sheet.getRow(1).font = {
    bold: true,
  }

  // Apply conditional formatting to units column
  sheet.eachRow((row, index) => {
    if (index === 1) return // Skip header row

    const units = Number(row.getCell(5).value)

    if (units > 0) {
      row.getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF9C4' },
      }
    }
  })

  // Freeze header row
  sheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ]

  return workbook.xlsx.writeBuffer()
}
