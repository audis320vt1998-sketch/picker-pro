import type { PickingRow, CatalogEntry } from '../engine/types'

export type RuleCondition = (row: PickingRow, catalog: Map<string, CatalogEntry>) => boolean

export type RuleAction = (
  row: PickingRow,
  catalog: Map<string, CatalogEntry>
) => { row?: PickingRow; warnings?: string[]; message?: string }

export interface Rule {
  id: string
  name: string
  description?: string
  category?: string
  enabled: boolean
  priority: number
  type?: 'contains' | 'regex' | 'brand'
  value?: string
  packSize?: number
  allowUnits?: boolean
  condition: RuleCondition
  action: RuleAction
}

export interface RuleConfig {
  id: string
  name: string
  description?: string
  category?: string
  enabled: boolean
  priority: number
  conditionType: string
  conditionParams?: Record<string, unknown>
  actionType: string
  actionParams?: Record<string, unknown>
}

export interface RuleExecutionResult {
  ruleId: string
  ruleName: string
  executed: boolean
  matched: boolean
  row?: PickingRow
  warnings: string[]
  message?: string
}
