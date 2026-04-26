import { and, eq, inArray, notInArray } from 'drizzle-orm';
import { db } from '~~/server/db';

import {
  appointmentPets,
  employeeSchedules,
  employeeServices,
  scheduleOverrides,
  users,
} from '~~/server/db/schema';

import type {
  CreateOverrideInput,
  ScheduleEntryInput,
  UpdateOverrideInput,
} from '~~/shared/schemas/schedule';

//#region Weekly schedule
export async function getWeeklySchedule(userId: string) {
  return db
    .select()
    .from(employeeSchedules)
    .where(eq(employeeSchedules.userId, userId))
    .orderBy(employeeSchedules.dayOfWeek);
}

export async function setWeeklySchedule(userId: string, entries: ScheduleEntryInput[]) {
  await db.transaction(async (tx) => {
    await tx.delete(employeeSchedules).where(eq(employeeSchedules.userId, userId));

    if (entries.length > 0) {
      await tx.insert(employeeSchedules).values(entries.map((e) => ({ userId, ...e })));
    }
  });

  return getWeeklySchedule(userId);
}
//#endregion

//#region Schedule overrides
export async function listOverrides(userId: string) {
  return db
    .select()
    .from(scheduleOverrides)
    .where(eq(scheduleOverrides.userId, userId))
    .orderBy(scheduleOverrides.date);
}

export async function getOverride(id: number) {
  const [override] = await db.select().from(scheduleOverrides).where(eq(scheduleOverrides.id, id));

  if (!override) throw createError({ statusCode: 404, message: 'Override not found' });
  return override;
}

export async function createOverride(userId: string, input: CreateOverrideInput) {
  const [override] = await db
    .insert(scheduleOverrides)
    .values({ userId, ...input })
    .returning();

  return override;
}

export async function updateOverride(id: number, input: UpdateOverrideInput) {
  await getOverride(id);

  const [updated] = await db
    .update(scheduleOverrides)
    .set(input)
    .where(eq(scheduleOverrides.id, id))
    .returning();

  return updated;
}

export async function deleteOverride(id: number) {
  await getOverride(id);
  await db.delete(scheduleOverrides).where(eq(scheduleOverrides.id, id));
}
//#endregion

//#region Availability engine
interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface GroomerSlot {
  groomerId: string;
  groomerName: string;
  slots: TimeSlot[];
}

/**
 * Get available time slots for a given date, duration, and optional service filter.
 * **AI assisted with some of the logic here
 *
 * 1. Find groomers qualified for the requested service (if serviceId provided).
 * 2. Get each groomer's weekly schedule for that day-of-week.
 * 3. Apply any overrides for that specific date.
 * 4. Subtract existing appointments.
 * 5. Return slots where the remaining contiguous block >= requested duration.
 */
export async function getAvailableSlots(
  date: string,
  durationMinutes: number,
  serviceIds?: number[],
) {
  const dayOfWeek = new Date(date).getUTCDay();

  // 1. Find qualified groomers
  let groomerIds: string[];

  if (serviceIds && serviceIds.length > 0) {
    // For each service, find qualified groomers, then intersect
    const qualifiedSets: Set<string>[] = [];

    for (const serviceId of serviceIds) {
      const qualified = await db
        .select({ userId: employeeServices.userId })
        .from(employeeServices)
        .where(eq(employeeServices.serviceId, serviceId));

      qualifiedSets.push(new Set(qualified.map((q) => q.userId)));
    }

    // Intersect only groomers qualified for ALL requested services
    const intersection = qualifiedSets.reduce((acc, set) => {
      return new Set([...acc].filter((id) => set.has(id)));
    });

    groomerIds = [...intersection];
    if (groomerIds.length === 0) return [];
  } else {
    // All groomers who have any schedule entry
    const all = await db.select({ userId: employeeSchedules.userId }).from(employeeSchedules);

    groomerIds = [...new Set(all.map((a) => a.userId))];
    if (groomerIds.length === 0) return [];
  }

  // 2. Get weekly schedule entries for this day
  const scheduleRows = await db
    .select()
    .from(employeeSchedules)
    .where(
      and(
        inArray(employeeSchedules.userId, groomerIds),
        eq(employeeSchedules.dayOfWeek, dayOfWeek),
        eq(employeeSchedules.isAvailable, true),
      ),
    );

  // 3. Get overrides for this date
  const overrideRows = await db
    .select()
    .from(scheduleOverrides)
    .where(and(inArray(scheduleOverrides.userId, groomerIds), eq(scheduleOverrides.date, date)));

  // 4. Get existing appointments for this date (non cancelled)
  const existingAppts = await db
    .select()
    .from(appointmentPets)
    .where(
      and(
        inArray(appointmentPets.assignedGroomerId, groomerIds),
        eq(appointmentPets.scheduledDate, date),
        notInArray(appointmentPets.status, ['cancelled', 'no_show', 'completed']),
      ),
    );

  // get groomer names
  const groomerRows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(inArray(users.id, groomerIds));

  const results: GroomerSlot[] = [];

  // if the date is today, filter out slots that have already started
  const isToday = date === todayDateString();
  const now = new Date();
  const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : null;

  for (const groomerId of groomerIds) {
    // check override first, it takes precedence
    const override = overrideRows.find((o) => o.userId === groomerId);

    let workBlocks: TimeSlot[];

    if (override) {
      if (!override.isAvailable) continue; // day off
      if (override.startTime && override.endTime) {
        workBlocks = [{ startTime: override.startTime, endTime: override.endTime }];
      } else {
        continue; // marked unavailable with no times
      }
    } else {
      // Use weekly schedule
      const entries = scheduleRows.filter((s) => s.userId === groomerId);
      if (entries.length === 0) continue;
      workBlocks = entries.map((e) => ({ startTime: e.startTime, endTime: e.endTime }));
    }

    // Subtract existing appointments
    const appts = existingAppts
      .filter((a) => a.assignedGroomerId === groomerId)
      .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

    // Compute available slots from work blocks
    const available: TimeSlot[] = [];

    for (const block of workBlocks) {
      const freeSlots = subtractAppointments(block, appts);
      // Generate slots of the requested duration from each free block
      for (const free of freeSlots) {
        const slots = generateSlots(free, durationMinutes);
        const futureSlots =
          nowMinutes !== null
            ? slots.filter((s) => timeToMinutes(s.startTime) >= nowMinutes)
            : slots;
        available.push(...futureSlots);
      }
    }

    if (available.length > 0) {
      const groomer = groomerRows.find((g) => g.id === groomerId);
      const groomerName = groomer ? `${groomer.firstName} ${groomer.lastName[0]}.` : 'Groomer';
      results.push({ groomerId, groomerName, slots: available });
    }
  }

  return results;
}
//#endregion

//#region Helpers
/**
 * Given a work block and a list of booked appointments,
 * return the free time ranges within the block.
 */
export function subtractAppointments(block: TimeSlot, appts: TimeSlot[]): TimeSlot[] {
  let freeStart = timeToMinutes(block.startTime);
  const blockEnd = timeToMinutes(block.endTime);

  // Sort appointments by start time
  const sorted = appts
    .map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) }))
    .filter((a) => a.end > freeStart && a.start < blockEnd)
    .sort((a, b) => a.start - b.start);

  const free: TimeSlot[] = [];

  for (const appt of sorted) {
    if (appt.start > freeStart) {
      free.push({
        startTime: minutesToTime(freeStart),
        endTime: minutesToTime(Math.min(appt.start, blockEnd)),
      });
    }
    freeStart = Math.max(freeStart, appt.end);
  }

  if (freeStart < blockEnd) {
    free.push({
      startTime: minutesToTime(freeStart),
      endTime: minutesToTime(blockEnd),
    });
  }

  return free;
}

/**
 * Generate bookable time slots of the given duration within a free block.
 * Slots start every 30 minutes (configurable).
 */
export function generateSlots(
  block: TimeSlot,
  durationMinutes: number,
  stepMinutes = 30,
): TimeSlot[] {
  const blockStart = timeToMinutes(block.startTime);
  const blockEnd = timeToMinutes(block.endTime);
  const slots: TimeSlot[] = [];

  for (let start = blockStart; start + durationMinutes <= blockEnd; start += stepMinutes) {
    slots.push({
      startTime: minutesToTime(start),
      endTime: minutesToTime(start + durationMinutes),
    });
  }

  return slots;
}
//#endregion
