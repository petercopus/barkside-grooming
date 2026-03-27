/**
 * Snapshots a reactive state object on creation.
 * Provides a function to restore it to that initial state.
 */
export function useDiscardable(
  state: Record<string, unknown>,
  pageSave?: { resetSnapshots: () => void } | null,
) {
  const snapshot = JSON.parse(JSON.stringify(state));

  function discardChanges() {
    Object.assign(state, JSON.parse(JSON.stringify(snapshot)));
    pageSave?.resetSnapshots();
  }

  return { discardChanges };
}
