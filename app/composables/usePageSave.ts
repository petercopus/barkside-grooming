/**
 * ** AI assisted writing this composable
 * Composable for pages with multiple independent sections that save to different API endpoints.
 * Tracks dirty state per section and only fires API calls for sections that actually changed.
 *
 * Usage:
 *
 * const { submit, loading, error, isDirty } = usePageSave({
 *   sections: {
 *     details: {
 *       track: () => ({ firstName: state.firstName, lastName: state.lastName }),
 *       save: (data) => $fetch(`/api/admin/employees/${id}`, { method: 'PATCH', body: data }),
 *     },
 *     services: {
 *       track: () => ({ serviceIds: selectedServiceIds.value }),
 *       save: (data) => $fetch(`/api/admin/employees/${id}/services`, { method: 'PUT', body: data }),
 *     },
 *   },
 *   successMessage: 'Employee updated',
 * })
 *
 */

interface SectionDef<T = any> {
  /** Returns the current value of this section's data. Must be serializable. */
  track: () => T;
  /** Fires the API call to persist this section. Only called when data differs from snapshot. */
  save: (data: T) => Promise<unknown>;
}

interface UsePageSaveOptions {
  sections: Record<string, SectionDef>;
  successMessage?: string;
  onSuccess?: () => void | Promise<void>;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((val, i) => deepEqual(val, b[i]));
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) =>
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }

  return false;
}

function cloneSnapshot(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(cloneSnapshot);
  if (typeof value === 'object') {
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      clone[k] = cloneSnapshot(v);
    }
    return clone;
  }
  return value;
}

export function usePageSave(options: UsePageSaveOptions) {
  const toast = useToast();
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Snapshot initial values for each section
  const snapshots = new Map<string, unknown>();
  for (const [key, section] of Object.entries(options.sections)) {
    snapshots.set(key, cloneSnapshot(section.track()));
  }

  /** Which section keys have unsaved changes */
  const dirtyKeys = computed(() =>
    Object.entries(options.sections)
      .filter(([key, section]) => !deepEqual(section.track(), snapshots.get(key)))
      .map(([key]) => key),
  );

  /** Whether any section has unsaved changes */
  const isDirty = computed(() => dirtyKeys.value.length > 0);

  /**
   * Saves all dirty sections. Runs saves in parallel since sections are independent.
   * On success, resets snapshots so subsequent saves only fire for new changes.
   * On partial failure, only resets snapshots for sections that succeeded.
   */
  async function submit() {
    error.value = null;

    const dirty = Object.entries(options.sections).filter(([key]) => dirtyKeys.value.includes(key));

    if (dirty.length === 0) {
      toast.add({ title: 'No changes to save', color: 'neutral' });
      return;
    }

    loading.value = true;

    try {
      const results = await Promise.allSettled(
        dirty.map(async ([key, section]) => {
          const data = section.track();
          await section.save(data);
          return key;
        }),
      );

      // Reset snapshots only for sections that succeeded
      const failures: string[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const key = result.value;
          snapshots.set(key, cloneSnapshot(options.sections[key]!.track()));
        } else {
          const err = result.reason;
          failures.push(err.data?.message ?? err.message ?? 'Something went wrong');
        }
      }

      if (failures.length > 0) {
        error.value = failures.join('; ');
      } else {
        if (options.successMessage) {
          toast.add({ title: options.successMessage, color: 'success' });
        }
        if (options.onSuccess) {
          await options.onSuccess();
        }
      }
    } catch (e: any) {
      error.value = e.data?.message ?? e.message ?? 'Something went wrong';
    } finally {
      loading.value = false;
    }
  }

  /** Re-snapshot all sections (e.g., after fetching fresh data from the server) */
  function resetSnapshots() {
    for (const [key, section] of Object.entries(options.sections)) {
      snapshots.set(key, cloneSnapshot(section.track()));
    }
  }

  return { isDirty, dirtyKeys, loading, error, submit, resetSnapshots };
}
