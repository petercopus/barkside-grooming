/**
 * Permission checking helpers
 * - TODO: usage examples
 */

export function usePermissions() {
  const { permissions } = useAuth();

  function hasPerm(key: string): boolean {
    return permissions.value.includes('*') || permissions.value.includes(key);
  }

  function hasAnyPerm(keys: string[]): boolean {
    return permissions.value.includes('*') || keys.some((key) => permissions.value.includes(key));
  }

  function hasAllPerms(keys: string[]): boolean {
    return permissions.value.includes('*') || keys.every((key) => permissions.value.includes(key));
  }

  return {
    hasPerm,
    hasAnyPerm,
    hasAllPerms,
  };
}
