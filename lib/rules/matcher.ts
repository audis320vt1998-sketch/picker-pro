import type { PickingRow, CatalogEntry } from '../engine/types'

/**
 * Rule Matcher - Tests conditions against picking rows.
 */
export class RuleMatcher {
  private registeredMatchers: string[] = ['contains', 'regex', 'brand']

  test(
    _row: PickingRow,
    _catalog: Map<string, CatalogEntry>,
    conditionType: string,
    _params?: Record<string, unknown>
  ): boolean {
    // TODO: Implement condition matching logic
    return this.registeredMatchers.includes(conditionType)
  }

  getMatchers(): string[] {
    return this.registeredMatchers
  }
}

/**
 * Rule Action - Executes actions on picking rows.
 */
export class RuleAction {
  private registeredActions: string[] = ['flag', 'correct', 'skip']

  execute(
    row: PickingRow,
    _catalog: Map<string, CatalogEntry>,
    _actionType: string,
    _params?: Record<string, unknown>
  ): { row?: PickingRow; warnings?: string[]; message?: string } {
    // TODO: Implement action execution logic
    return { row }
  }

  getActions(): string[] {
    return this.registeredActions
  }
}
