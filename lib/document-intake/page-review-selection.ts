/**
 * Updates only the row keys currently presented to the reviewer. The caller
 * supplies transferable, visible keys, so rows hidden by a filter and rows
 * blocked from the handoff keep their prior state.
 */
export function setOcrPreflightVisibleRowSelections(
  selectedRowKeys: Readonly<Record<string, boolean>>,
  visibleTransferableRowKeys: readonly string[],
  selected: boolean
): Record<string, boolean> {
  const nextSelections = { ...selectedRowKeys }
  const handledKeys = new Set<string>()
  let changed = false

  for (const key of visibleTransferableRowKeys) {
    if (key.length === 0 || handledKeys.has(key)) {
      continue
    }

    handledKeys.add(key)
    if (selected) {
      if (nextSelections[key] !== true) {
        nextSelections[key] = true
        changed = true
      }
      continue
    }

    if (key in nextSelections) {
      delete nextSelections[key]
      changed = true
    }
  }

  return changed ? nextSelections : selectedRowKeys
}
