import type {
  Rule,
  RuleConfig,
  RuleExecutionResult,
  RuleCondition,
  RuleAction as RuleActionType
} from './types'
import type { PickingRow, CatalogEntry } from '../engine/types'
import { RuleMatcher, RuleAction } from './matcher'

/**
 * Rules Engine - Executes rules against picking rows
 */
export class RulesEngine {
  private rules: Map<string, Rule> = new Map()
  private matcher: RuleMatcher
  private actionExecutor: RuleAction

  constructor() {
    this.matcher = new RuleMatcher()
    this.actionExecutor = new RuleAction()
  }

  /**
   * Add a rule
   */
  addRule(rule: Rule): void {
    this.rules.set(rule.id, rule)
  }

  /**
   * Remove a rule
   */
  removeRule(id: string): void {
    this.rules.delete(id)
  }

  /**
   * Get a rule
   */
  getRule(id: string): Rule | undefined {
    return this.rules.get(id)
  }

  /**
   * Get all rules
   */
  getRules(): Rule[] {
    return Array.from(this.rules.values())
  }

  /**
   * Load rules from configuration
   */
  loadRulesFromConfig(configs: RuleConfig[]): void {
    for (const config of configs) {
      if (!config.enabled) continue

      const condition: RuleCondition = (row, catalog) => {
        return this.matcher.test(
          row,
          catalog,
          config.conditionType,
          config.conditionParams
        )
      }

      const action: RuleActionType = (row, catalog) => {
        return this.actionExecutor.execute(
          row,
          catalog,
          config.actionType,
          config.actionParams
        )
      }

      const rule: Rule = {
        id: config.id,
        name: config.name,
        description: config.description,
        category: config.category,
        enabled: config.enabled,
        priority: config.priority,
        condition,
        action
      }

      this.addRule(rule)
    }
  }

  /**
   * Execute rules on a single row
   */
  executeRules(
    row: PickingRow,
    catalog: Map<string, CatalogEntry>
  ): { row: PickingRow; results: RuleExecutionResult[] } {
    let currentRow = row
    const results: RuleExecutionResult[] = []

    // Sort rules by priority (lower number = higher priority)
    const sortedRules = Array.from(this.rules.values()).sort(
      (a, b) => a.priority - b.priority
    )

    for (const rule of sortedRules) {
      if (!rule.enabled) continue

      try {
        const matched = rule.condition(currentRow, catalog)

        if (matched) {
          const actionResult = rule.action(currentRow, catalog)

          if (actionResult.row) {
            currentRow = actionResult.row
          }

          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            executed: true,
            matched: true,
            row: actionResult.row || currentRow,
            warnings: actionResult.warnings || [],
            message: actionResult.message
          })
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            executed: true,
            matched: false,
            warnings: [],
            message: undefined
          })
        }
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error)
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          executed: false,
          matched: false,
          warnings: [`Error: ${String(error)}`],
          message: undefined
        })
      }
    }

    return { row: currentRow, results }
  }

  /**
   * Execute rules on multiple rows
   */
  executeRulesOnRows(
    rows: PickingRow[],
    catalog: Map<string, CatalogEntry>
  ): {
    rows: PickingRow[]
    results: Map<number, RuleExecutionResult[]>
  } {
    const resultRows: PickingRow[] = []
    const resultMap = new Map<number, RuleExecutionResult[]>()

    for (const row of rows) {
      const { row: processedRow, results } = this.executeRules(row, catalog)
      resultRows.push(processedRow)
      resultMap.set(row.index, results)
    }

    return { rows: resultRows, results: resultMap }
  }

  /**
   * Enable a rule
   */
  enableRule(id: string): void {
    const rule = this.rules.get(id)
    if (rule) {
      rule.enabled = true
    }
  }

  /**
   * Disable a rule
   */
  disableRule(id: string): void {
    const rule = this.rules.get(id)
    if (rule) {
      rule.enabled = false
    }
  }

  /**
   * Get registered matchers
   */
  getMatchers(): string[] {
    return this.matcher.getMatchers()
  }

  /**
   * Get registered actions
   */
  getActions(): string[] {
    return this.actionExecutor.getActions()
  }
}

// Export
export { RuleMatcher, RuleAction }
