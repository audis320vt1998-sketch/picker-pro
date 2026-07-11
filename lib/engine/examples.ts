/**
 * Usage Examples for PickingEngine
 */

import { PickingEngine } from './picking-engine'
import type { CatalogEntry } from './types'
import rulesConfig from '../rules/rules.json'

// Example 1: Basic usage
export async function basicExample() {
  const catalogEntries: CatalogEntry[] = [
    {
      sku: '88135',
      barcode: '7622300988135',
      name: 'Pringles Original',
      packSize: 10,
      allowUnits: true,
      category: 'Snacks',
      supplier: 'PepsiCo'
    },
    {
      sku: '88108',
      barcode: '7622300988108',
      name: 'Pringles Paprika',
      packSize: 10,
      allowUnits: true,
      category: 'Snacks',
      supplier: 'PepsiCo'
    }
  ]

  const engine = new PickingEngine(catalogEntries, '2026-07-12-001')

  const ocrText = `
    88135 Pringles Original 50 cases
    881O8 Pringles Paprika 24 units
    88135 Pringles Original 15 units
  `

  const result = await engine.process(ocrText)

  console.log('✅ Batch ID:', result.batchId)
  console.log('📊 OCR Accuracy:', `${(result.statistics.ocrAccuracy * 100).toFixed(1)}%`)
  console.log('🛍️ Products:', result.statistics.totalProducts)
  console.log('📦 Cases:', result.statistics.totalCases)
  console.log('🔹 Units:', result.statistics.totalUnits)

  return result
}

// Example 2: With rules engine
export async function withRulesExample() {
  const catalogEntries: CatalogEntry[] = [
    {
      sku: '88135',
      barcode: '7622300988135',
      name: 'Pringles Original',
      packSize: 10,
      allowUnits: true,
      category: 'Snacks',
      supplier: 'PepsiCo'
    },
    {
      sku: '88108',
      barcode: '7622300988108',
      name: 'Pringles Paprika',
      packSize: 20,
      allowUnits: false,
      category: 'Snacks',
      supplier: 'PepsiCo'
    }
  ]

  const engine = new PickingEngine(catalogEntries, '2026-07-12-002')
  
  // Load rules
  engine.loadRules(rulesConfig.rules)

  const ocrText = `
    88135 Pringles Original 2 units
    88108 Pringles Paprika 15 units
  `

  const result = await engine.processWithRules(ocrText)

  console.log('✅ With Rules Applied:')
  console.log('   Total Quantity:', result.statistics.totalQuantity)
  console.log('   Warnings:', result.warnings.length)

  return result
}

// Example 3: Export to CSV
export async function exportExample() {
  const catalogEntries: CatalogEntry[] = [
    {
      sku: '88135',
      name: 'Pringles Original',
      packSize: 10,
      allowUnits: true
    }
  ]

  const engine = new PickingEngine(catalogEntries)

  const ocrText = `
    88135 Pringles Original 50 cases
  `

  const result = await engine.process(ocrText)

  // Export as JSON
  const jsonExport = await engine.exportResult(result, 'json')
  console.log('📄 JSON Export:', jsonExport)

  // Export as CSV
  const csvExport = await engine.exportResult(result, 'csv')
  console.log('📊 CSV Export:', csvExport)

  return { jsonExport, csvExport }
}

// Example 4: Aggregate by category
export async function aggregateExample() {
  const catalogEntries: CatalogEntry[] = [
    {
      sku: '88135',
      name: 'Pringles Original',
      packSize: 10,
      allowUnits: true,
      category: 'Snacks',
      supplier: 'PepsiCo'
    },
    {
      sku: '88108',
      name: 'Pringles Paprika',
      packSize: 10,
      allowUnits: true,
      category: 'Snacks',
      supplier: 'PepsiCo'
    },
    {
      sku: '12345',
      name: 'Coca-Cola 2L',
      packSize: 6,
      allowUnits: true,
      category: 'Beverages',
      supplier: 'Coca-Cola'
    }
  ]

  const engine = new PickingEngine(catalogEntries)

  const ocrText = `
    88135 Pringles Original 30 units
    88108 Pringles Paprika 20 units
    12345 Coca-Cola 2L 18 units
  `

  const result = await engine.process(ocrText)

  // Aggregate by category
  const byCategory = engine.aggregateByCategory(result)
  console.log('📁 Grouped by Category:')
  for (const group of byCategory) {
    console.log(`  ${group.label}: ${group.count} products, ${group.totalQuantity} units`)
  }

  // Aggregate by supplier
  const bySupplier = engine.aggregateBySupplier(result)
  console.log('🏭 Grouped by Supplier:')
  for (const group of bySupplier) {
    console.log(`  ${group.label}: ${group.count} products, ${group.totalQuantity} units`)
  }

  // Aggregate by status
  const byStatus = engine.aggregateByStatus(result)
  console.log('✅ Grouped by Status:')
  for (const group of byStatus) {
    console.log(`  ${group.label}: ${group.count} products`)
  }

  return { byCategory, bySupplier, byStatus }
}

// Example 5: Detailed output
export async function detailedOutputExample() {
  const catalogEntries: CatalogEntry[] = [
    {
      sku: '88135',
      barcode: '7622300988135',
      name: 'Pringles Original',
      packSize: 10,
      allowUnits: true,
      category: 'Snacks',
      supplier: 'PepsiCo'
    }
  ]

  const engine = new PickingEngine(catalogEntries)

  const ocrText = `
    881O8 Pringles Original 55 units
  `

  const result = await engine.process(ocrText)

  // Export formatted
  const formatted = await engine.exportFormatted(result)
  console.log('📋 Formatted Output:')
  console.log(JSON.stringify(formatted, null, 2))

  return formatted
}

// Run examples
async function runExamples() {
  console.log('\n=== Example 1: Basic Usage ===')
  await basicExample()

  console.log('\n=== Example 2: With Rules Engine ===')
  await withRulesExample()

  console.log('\n=== Example 3: Export ===')
  await exportExample()

  console.log('\n=== Example 4: Aggregation ===')
  await aggregateExample()

  console.log('\n=== Example 5: Detailed Output ===')
  await detailedOutputExample()
}

// Export for testing
export { runExamples }
