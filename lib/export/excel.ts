import ExcelJS from 'exceljs'
import { ProductSummary } from '@/lib/calculator'

export async function exportToExcel(rows: ProductSummary[]) {
  const workbook = new ExcelJS.Workbook()

  const sheet = workbook.addWorksheet('רשימת ליקוט')

  sheet.columns = [
    { header: 'מק״ט', key: 'sku', width: 12 },
    { header: 'ברקוד', key: 'barcode', width: 18 },
    { header: 'מוצר', key: 'name', width: 50 },
    { header: 'מארזים', key: 'cases', width: 12 },
    { header: 'בודדים', key: 'units', width: 12 },
  ]

  // Sort rows by SKU
  rows.sort((a, b) => {
    return Number(a.sku) - Number(b.sku)
  })

  // Add rows
  rows.forEach((row) => sheet.addRow(row))

  // Format header row
  sheet.getRow(1).font = {
    bold: true,
  }

  // Apply conditional formatting to units column
  sheet.eachRow((row, index) => {
    if (index === 1) return

    const units = Number(row.getCell(5).value)

    if (units > 0) {
      row.getCell(5).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9C4' },
      }
    }
  })

  // Add totals row
  sheet.addRow([])

  sheet.addRow({
    name: 'סה״כ',
    cases: rows.reduce((s, r) => s + r.cases, 0),
    units: rows.reduce((s, r) => s + r.units, 0),
  })

  // Configure page setup for printing
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
  }

  // Freeze header row
  sheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ]

  return workbook.xlsx.writeBuffer()
}
