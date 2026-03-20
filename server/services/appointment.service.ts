import { and, desc, eq, gt, inArray, lt, notInArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  appointmentPets,
  appointments,
  appointmentServices,
  pets,
  servicePricing,
  services,
} from '~~/server/db/schema';
import { minutesToTime, timeToMinutes } from '~~/server/utils/date';
import { CreateBookingInput } from '~~/shared/schemas/appointment';

/**
 * Batch load pets and services for a set of appointments
 *
 * Avoid N+1 by fetching all related rows in two batches then group in JS
 */
async function enrichAppointments(appointmentRows: (typeof appointments.$inferSelect)[]) {
  if (appointmentRows.length === 0) return [];

  const appointmentIds = appointmentRows.map((ar) => ar.id);

  const petRows = await db
    .select()
    .from(appointmentPets)
    .innerJoin(pets, eq(appointmentPets.petId, pets.id))
    .where(inArray(appointmentPets.appointmentId, appointmentIds));

  const petIds = petRows.map((pr) => pr.appointment_pets.id);

  const serviceRows =
    petIds.length > 0
      ? await db
          .select()
          .from(appointmentServices)
          .innerJoin(services, eq(appointmentServices.serviceId, services.id))
          .where(inArray(appointmentServices.appointmentPetId, petIds))
      : [];

  return appointmentRows.map((appt) => ({
    ...appt,
    pets: petRows
      .filter((pr) => pr.appointment_pets.appointmentId === appt.id)
      .map((pr) => ({
        ...pr.appointment_pets,
        petName: pr.pets.name,
        services: serviceRows
          .filter((sr) => sr.appointment_services.appointmentPetId === pr.appointment_pets.id)
          .map((sr) => ({
            ...sr.appointment_services,
            serviceName: sr.services.name,
          })),
      })),
  }));
}

/**
 * Book an appointment for one or more pets
 * 1. validate ownership
 * 2. resolve pricing
 * 3. check conflicts
 * 4. insert appointment, pets, services
 *
 * Returns new appointmentId
 */
export async function createBooking(customerId: string, input: CreateBookingInput) {
  return db.transaction(async (tx) => {
    // 1. Validate pet ownership
    const customerPets = await tx
      .select()
      .from(pets)
      .where(
        and(
          inArray(
            pets.id,
            input.pets.map((p) => p.petId),
          ),
          eq(pets.ownerId, customerId),
          eq(pets.isActive, true),
        ),
      );

    // block booking if unable to verify ownership of atleast one of the requested pets
    if (customerPets.length !== input.pets.length) {
      throw createError({ statusCode: 400, message: 'One or more pets not found' });
    }

    // 2. Batch fetch pricing rows for all requested services
    const serviceIds = [...new Set(input.pets.map((p) => p.serviceId))];

    const pricingRows = await tx
      .select()
      .from(servicePricing)
      .where(inArray(servicePricing.serviceId, serviceIds));

    const petBookings = input.pets.map((p) => {
      const pet = customerPets.find((cp) => cp.id === p.petId)!;
      const pricing = pricingRows.find(
        (pr) => pr.serviceId === p.serviceId && pr.sizeCategoryId === pet.sizeCategoryId,
      );

      if (!pricing) {
        throw createError({
          statusCode: 400,
          message: `No pricing found for service ${p.serviceId} at size ${pet.sizeCategoryId}`,
        });
      }

      // calculate end time
      const startMinutes = timeToMinutes(p.startTime);
      const endMinutes = startMinutes + pricing.durationMinutes;
      const endTime = minutesToTime(endMinutes);

      return {
        ...p,
        pet,
        pricing,
        endTime,
      };
    });

    // 3. Verify no groomer has an overlapping booking on the same date
    // overlap is existing.start < new.end && new.start < existing.end
    // TODO: also check for overlap between petBookings in this request (same groomer, same date)
    for (const booking of petBookings) {
      const conflicts = await tx
        .select({ id: appointmentPets.id })
        .from(appointmentPets)
        .where(
          and(
            eq(appointmentPets.assignedGroomerId, booking.groomerId),
            eq(appointmentPets.scheduledDate, booking.scheduledDate),
            notInArray(appointmentPets.status, ['cancelled', 'no_show']),
            lt(appointmentPets.startTime, booking.endTime),
            gt(appointmentPets.endTime, booking.startTime),
          ),
        )
        .limit(1);

      if (conflicts.length > 0) {
        throw createError({
          statusCode: 409,
          message: `Time slot ${booking.startTime}-${booking.endTime} is no longer available`,
        });
      }
    }

    // 4. Insert appointment + appointmentPets + appointmentServices

    // appointments
    const [appointmentId] = await tx
      .insert(appointments)
      .values({
        customerId,
        notes: input.notes,
      })
      .returning({ id: appointments.id });

    if (!appointmentId) {
      throw createError({ statusCode: 400, message: 'Failed to create appointment' });
    }

    for (const pb of petBookings) {
      // appointmentPets
      const [appointmentPetId] = await tx
        .insert(appointmentPets)
        .values({
          appointmentId: appointmentId.id,
          petId: pb.petId,
          assignedGroomerId: pb.groomerId,
          scheduledDate: pb.scheduledDate,
          startTime: pb.startTime,
          endTime: pb.endTime,
          estimatedDurationMinutes: pb.pricing.durationMinutes,
        })
        .returning({ id: appointmentPets.id });

      if (!appointmentPetId) {
        throw createError({ statusCode: 400, message: 'Failed to create appointmentPets' });
      }

      // appointmentServices
      await tx.insert(appointmentServices).values({
        appointmentPetId: appointmentPetId.id,
        serviceId: pb.serviceId,
        priceAtBookingCents: pb.pricing.priceCents,
        durationAtBookingMinutes: pb.pricing.durationMinutes,
      });
    }

    //
    return appointmentId.id;
  });
}

/**
 * List all appointments for a customer
 */
export async function listBookings(customerId: string) {
  const apptRows = await db
    .select()
    .from(appointments)
    .where(eq(appointments.customerId, customerId))
    .orderBy(desc(appointments.createdAt));

  return enrichAppointments(apptRows);
}

/**
 * Get a single appointment
 */
export async function getBooking(bookingId: string, customerId: string) {
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, bookingId), eq(appointments.customerId, customerId)));

  if (!appointment) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  const [enriched] = await enrichAppointments([appointment]);
  return enriched;
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string, customerId: string) {
  const booking = await getBooking(bookingId, customerId);

  // only pending/confirmed appointments can be cancelled
  if (!['pending', 'confirmed'].includes(booking!.status)) {
    throw createError({ statusCode: 400, message: 'Appointment cannot be cancelled' });
  }

  // update appointments
  await db
    .update(appointments)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(appointments.id, bookingId));

  // update appointmentPets
  await db
    .update(appointmentPets)
    .set({ status: 'cancelled' })
    .where(eq(appointmentPets.appointmentId, bookingId));

  // return updated booking
  return {
    ...booking,
    status: 'cancelled',
  };
}

/**
 * List all appointments with optional filters
 */
export async function listAllBookings(filters?: { status?: string; date?: string }) {
  const conditions = [];

  if (filters?.date) {
    // subquery against appointmentPets.scheduledDate since date lives on pet level rows
    const apptIdsForDate = await db
      .selectDistinct({ id: appointmentPets.appointmentId })
      .from(appointmentPets)
      .where(eq(appointmentPets.scheduledDate, filters.date));

    if (apptIdsForDate.length === 0) return [];

    conditions.push(
      inArray(
        appointments.id,
        apptIdsForDate.map((r) => r.id),
      ),
    );
  }

  if (filters?.status) {
    conditions.push(eq(appointments.status, filters.status));
  }

  const apptRows = await db
    .select()
    .from(appointments)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(appointments.createdAt));

  return enrichAppointments(apptRows);
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, bookingId));

  if (!appointment) {
    throw createError({ statusCode: 404, message: 'Appointment not found' });
  }

  await db
    .update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(eq(appointments.id, bookingId));

  await db
    .update(appointmentPets)
    .set({ status })
    .where(eq(appointmentPets.appointmentId, bookingId));

  return { ...appointment, status };
}
