import { CalendarDate, Time } from '@internationalized/date';

/* ─────────────────────────────────── *
 * CalendarDate / Time parsing
 * ─────────────────────────────────── */
export function parseCalendarDate(value: string | undefined | null): CalendarDate | undefined {
  if (!value) return undefined;

  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return new CalendarDate(y, m, d);
}

export function formatCalendarDate(value: CalendarDate | undefined | null): string | undefined {
  if (!value) return undefined;
  return value.toString();
}

export function parseTime(value: string | undefined | null): Time | undefined {
  if (!value) return undefined;

  const [h, m] = value.split(':').map(Number) as [number, number];
  return new Time(h, m);
}

export function formatTime(value: Time | undefined | null): string | undefined {
  if (!value) return undefined;
  return value.toString().slice(0, 5);
}

export function calendarDateToString(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

/* ─────────────────────────────────── *
 * Display formatters
 * ─────────────────────────────────── */
const SHORT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

const LONG_DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  value: string | Date | null | undefined,
  variant: 'short' | 'long' | 'iso' = 'short',
): string {
  const d = toDate(value);
  if (!d) return '—';

  if (variant === 'iso') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const opts = variant === 'long' ? LONG_DATE_OPTS : SHORT_DATE_OPTS;
  return d.toLocaleDateString('en-US', opts);
}

/**
 * Format a 24-hour HH:MM or HH:MM:SS string as a 12-hour clock time
 */
export function formatClockTime(value: string | null | undefined): string {
  if (!value) return '—';
  const [h, m] = value.split(':').map(Number) as [number, number];
  if (Number.isNaN(h) || Number.isNaN(m)) return '—';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDateTime(
  date: string | Date | null | undefined,
  time: string | null | undefined,
): string {
  const d = formatDate(date);
  if (d === '—') return '—';
  const t = formatClockTime(time);
  if (t === '—') return d;
  return `${d} · ${t}`;
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const s = formatClockTime(start);
  const e = formatClockTime(end);
  if (s === '—' && e === '—') return '—';
  if (s === '—') return e;
  if (e === '—') return s;
  return `${s} — ${e}`;
}

/* ─────────────────────────────────── *
 * Time-of-day arithmetic (minutes <- -> "HH:MM")
 * ─────────────────────────────────── */
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

/* ─────────────────────────────────── *
 * Server-side helpers
 * ─────────────────────────────────── */
/**
 * Today's date in the host's local timezone, formatted as YYYY-MM-DD.
 */
export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
