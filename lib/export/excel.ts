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

  rows.forEach((row) => sheet.addRow(row))

  sheet.getRow(1).font = {
    bold: true,
  }

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

  sheet.views = [
    {
      state: 'frozen',
      ySplit: 1,
    },
  ]

  return workbook.xlsx.writeBuffer()
}
