/**
 * Permission checking helpers
 * - TODO: usage examples
 */

export function usePermissions() {
  const { permissions } = useAuth();

  /**
   * Single permission check
   */
  function hasPerm(key: string): boolean {
    return permissions.value.includes(key);
  }

  /**
   * Any permission check
   */
  function hasAnyPerm(keys: string[]): boolean {
    return keys.some((key) => permissions.value.includes(key));
  }

  /**
   * All permissions check
   */
  function hasAllPerms(keys: string[]): boolean {
    return keys.every((key) => permissions.value.includes(key));
  }

  return {
    hasPerm,
    hasAnyPerm,
    hasAllPerms,
  };
}
