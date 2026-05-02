function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Default start date = 30 days ago (YYYY-MM-DD)
export function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return localDateString(d);
}

// Default end date = today (YYYY-MM-DD)
export function defaultEnd(): string {
  return localDateString(new Date());
}
