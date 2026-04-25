import type { CalendarDate } from '@internationalized/date';

const AVAILABILITY_DEBOUNCE_MS = 300;

export function useBookingAvailability() {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function schedule(key: string, fn: () => void) {
    clearTimeout(timers.get(key));
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        fn();
      }, AVAILABILITY_DEBOUNCE_MS),
    );
  }

  function isCompleteCalendarDate(d: CalendarDate | undefined): d is CalendarDate {
    return !!d && d.year >= new Date().getFullYear();
  }

  onBeforeUnmount(() => {
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
  });

  return { schedule, isCompleteCalendarDate };
}
