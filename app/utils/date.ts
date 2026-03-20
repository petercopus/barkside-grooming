import { CalendarDate, Time } from '@internationalized/date';

/**
 * Date
 */
export function parseCalendarDate(value: string | undefined | null): CalendarDate | undefined {
  if (!value) return undefined;

  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return new CalendarDate(y, m, d);
}

export function formatCalendarDate(value: CalendarDate | undefined | null): string | undefined {
  if (!value) return undefined;
  return value.toString();
}

/**
 * Time
 */
export function parseTime(value: string | undefined | null): Time | undefined {
  if (!value) return undefined;

  const [h, m] = value.split(':').map(Number) as [number, number];
  return new Time(h, m);
}

export function formatTime(value: Time | undefined | null): string | undefined {
  if (!value) return undefined;
  return value.toString().slice(0, 5);
}
