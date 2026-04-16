// Default start date = 30 days ago (YYYY-MM-DD)
export function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

// Default end date = today (YYYY-MM-DD)
export function defaultEnd(): string {
  return new Date().toISOString().slice(0, 10);
}
