export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatCurrency(cents: number | null | undefined): string {
  const n = typeof cents === 'number' && Number.isFinite(cents) ? cents : 0;
  const sign = n < 0 ? '-' : '';
  return `${sign}$${(Math.abs(n) / 100).toFixed(2)}`;
}
