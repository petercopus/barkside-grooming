export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback = '',
): string {
  const first = firstName?.trim() ?? '';
  const last = lastName?.trim() ?? '';
  if (!first && !last) return fallback;
  return last ? `${first} ${last}` : first;
}
