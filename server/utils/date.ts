/** Convert "HH:MM" or "HH:MM:SS" to total minutes from midnight */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':') as [string, string];
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

/** Convert minutes from midnight to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
