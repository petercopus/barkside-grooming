import { describe, expect, it } from 'vitest';
import { generateSlots, subtractAppointments } from '~~/server/services/schedule.service';

describe('subtractAppointments', () => {
  it('returns the entire block when no appointments are booked', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '17:00' }, []);
    expect(free).toEqual([{ startTime: '09:00', endTime: '17:00' }]);
  });

  it('returns nothing when one appointment fills the block', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '11:00' }, [
      { startTime: '09:00', endTime: '11:00' },
    ]);
    expect(free).toEqual([]);
  });

  it('splits the block around a single appointment in the middle', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '17:00' }, [
      { startTime: '12:00', endTime: '13:00' },
    ]);
    expect(free).toEqual([
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '13:00', endTime: '17:00' },
    ]);
  });

  it('handles appointments at the start of the block', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '17:00' }, [
      { startTime: '09:00', endTime: '10:30' },
    ]);
    expect(free).toEqual([{ startTime: '10:30', endTime: '17:00' }]);
  });

  it('handles appointments at the end of the block', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '17:00' }, [
      { startTime: '16:00', endTime: '17:00' },
    ]);
    expect(free).toEqual([{ startTime: '09:00', endTime: '16:00' }]);
  });

  it('handles back-to-back appointments without producing a zero-length gap', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '17:00' }, [
      { startTime: '10:00', endTime: '11:00' },
      { startTime: '11:00', endTime: '12:00' },
    ]);
    expect(free).toEqual([
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '12:00', endTime: '17:00' },
    ]);
  });

  it('handles multiple non-contiguous appointments and unsorted input', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '17:00' }, [
      { startTime: '14:00', endTime: '15:00' },
      { startTime: '10:00', endTime: '11:00' },
    ]);
    expect(free).toEqual([
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '11:00', endTime: '14:00' },
      { startTime: '15:00', endTime: '17:00' },
    ]);
  });

  it('clips appointments that overlap the block boundary', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '12:00' }, [
      { startTime: '11:00', endTime: '14:00' },
    ]);
    expect(free).toEqual([{ startTime: '09:00', endTime: '11:00' }]);
  });

  it('ignores appointments fully outside the block', () => {
    const free = subtractAppointments({ startTime: '09:00', endTime: '17:00' }, [
      { startTime: '07:00', endTime: '08:00' },
      { startTime: '18:00', endTime: '19:00' },
    ]);
    expect(free).toEqual([{ startTime: '09:00', endTime: '17:00' }]);
  });
});

describe('generateSlots', () => {
  it('produces 30-min step slots that fit a 60-min duration', () => {
    const slots = generateSlots({ startTime: '09:00', endTime: '11:00' }, 60);
    expect(slots).toEqual([
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '09:30', endTime: '10:30' },
      { startTime: '10:00', endTime: '11:00' },
    ]);
  });

  it('returns nothing when block is shorter than the duration', () => {
    const slots = generateSlots({ startTime: '09:00', endTime: '09:30' }, 60);
    expect(slots).toEqual([]);
  });

  it('returns a single slot when block exactly fits one duration', () => {
    const slots = generateSlots({ startTime: '09:00', endTime: '10:00' }, 60);
    expect(slots).toEqual([{ startTime: '09:00', endTime: '10:00' }]);
  });

  it('respects custom step size', () => {
    const slots = generateSlots({ startTime: '09:00', endTime: '11:00' }, 60, 60);
    expect(slots).toEqual([
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '10:00', endTime: '11:00' },
    ]);
  });

  it('handles 90-min duration with 30-min step', () => {
    const slots = generateSlots({ startTime: '09:00', endTime: '11:00' }, 90);
    expect(slots).toEqual([
      { startTime: '09:00', endTime: '10:30' },
      { startTime: '09:30', endTime: '11:00' },
    ]);
  });

  it('does not produce slots that exceed the block end', () => {
    const slots = generateSlots({ startTime: '09:00', endTime: '10:15' }, 60);
    // 09:00–10:00 fits, next start 09:30 → 10:30 exceeds 10:15
    expect(slots).toEqual([{ startTime: '09:00', endTime: '10:00' }]);
  });
});
