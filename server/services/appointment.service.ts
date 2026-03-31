import { and, desc, eq, gt, inArray, lt, notInArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  appointmentAddons,
  appointmentBundles,
  appointmentPets,
  appointments,
  appointmentServices,
  bundles,
  pets,
  servicePricing,
  services,
  users,
} from '~~/server/db/schema';
import { minutesToTime, timeToMinutes } from '~~/server/utils/date';
import { CreateBookingInput } from '~~/shared/schemas/appointment';

/**
 * Batch load pets, services, customer for a set of appointments
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

  const addonRows =
    petIds.length > 0
      ? await db
          .select()
          .from(appointmentAddons)
          .innerJoin(services, eq(appointmentAddons.serviceId, services.id))
          .where(inArray(appointmentAddons.appointmentPetId, petIds))
      : [];

  const bundleRows =
    petIds.length > 0
      ? await db
          .select()
          .from(appointmentBundles)
          .innerJoin(bundles, eq(appointmentBundles.bundleId, bundles.id))
          .where(inArray(appointmentBundles.appointmentPetId, petIds))
      : [];

  const customerIds = [
    ...new Set(appointmentRows.map((ar) => ar.customerId).filter(Boolean)),
  ] as string[];

  const customerRows =
    customerIds.length > 0
      ? await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(inArray(users.id, customerIds))
      : [];

  return appointmentRows.map((appt) => {
    const customer = customerRows.find((cr) => cr.id === appt.customerId);

    return {
      ...appt,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Guest',
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
          addons: addonRows
            .filter((ar) => ar.appointment_addons.appointmentPetId === pr.appointment_pets.id)
            .map((ar) => ({
              ...ar.appointment_addons,
              serviceName: ar.services.name,
            })),
          bundles: bundleRows
            .filter((br) => br.appointment_bundles.appointmentPetId === pr.appointment_pets.id)
            .map((br) => ({
              ...br.appointment_bundles,
              bundleName: br.bundles.name,
            })),
        })),
    };
  });
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
    const allServiceIds = [...new Set(input.pets.flatMap((p) => [...p.serviceIds, ...p.addonIds]))];

    const pricingRows = await tx
      .select()
      .from(servicePricing)
      .where(inArray(servicePricing.serviceId, allServiceIds));

    const petBookings = input.pets.map((p) => {
      const pet = customerPets.find((cp) => cp.id === p.petId)!;

      // Pricing for base services
      const basePricingRows = p.serviceIds.map((svcId) => {
        const pricing = pricingRows.find(
          (pr) => pr.serviceId === svcId && pr.sizeCategoryId === pet.sizeCategoryId,
        );

        if (!pricing) {
          throw createError({
            statusCode: 400,
            message: `No pricing found for service ${svcId} at size ${pet.sizeCategoryId}`,
          });
        }

        return pricing;
      });

      // Pricing for addons
      const addonPricingRows = p.addonIds.map((svcId) => {
        const pricing = pricingRows.find(
          (pr) => pr.serviceId === svcId && pr.sizeCategoryId === pet.sizeCategoryId,
        );

        if (!pricing) {
          throw createError({
            statusCode: 400,
            message: `No pricing found for addon ${svcId} at size ${pet.sizeCategoryId}`,
          });
        }

        return pricing;
      });

      // Sum durations across all selected services and addons
      const totalDuration =
        basePricingRows.reduce((sum, pr) => sum + pr.durationMinutes, 0) +
        addonPricingRows.reduce((sum, pr) => sum + pr.durationMinutes, 0);

      // calculate end time
      const startMinutes = timeToMinutes(p.startTime);
      const endMinutes = startMinutes + totalDuration;
      const endTime = minutesToTime(endMinutes);

      return {
        ...p,
        pet,
        basePricingRows,
        addonPricingRows,
        totalDuration,
        endTime,
      };
    });

    // 3a. Check for intra-request conflicts (same groomer, same date, overlapping times)
    for (let i = 0; i < petBookings.length; i++) {
      for (let j = i + 1; j < petBookings.length; j++) {
        const a = petBookings[i]!;
        const b = petBookings[j]!;
        if (
          a.groomerId === b.groomerId &&
          a.scheduledDate === b.scheduledDate &&
          timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
          timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
        ) {
          throw createError({
            statusCode: 409,
            message:
              'Groomer time conflict: two pets are booked with the same groomer at overlapping times',
          });
        }
      }
    }

    // 3b. Verify no groomer has an overlapping booking on the same date in DB
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
          estimatedDurationMinutes: pb.totalDuration,
        })
        .returning({ id: appointmentPets.id });

      if (!appointmentPetId) {
        throw createError({ statusCode: 400, message: 'Failed to create appointmentPets' });
      }

      // appointmentServices — one row per service
      for (const svcId of pb.serviceIds) {
        const pricing = pb.basePricingRows.find((pr) => pr.serviceId === svcId)!;
        await tx.insert(appointmentServices).values({
          appointmentPetId: appointmentPetId.id,
          serviceId: svcId,
          priceAtBookingCents: pricing.priceCents,
          durationAtBookingMinutes: pricing.durationMinutes,
        });
      }

      // appointmentAddons — one row per addon
      for (const addonId of pb.addonIds) {
        const pricing = pb.addonPricingRows.find((pr) => pr.serviceId === addonId)!;
        await tx.insert(appointmentAddons).values({
          appointmentPetId: appointmentPetId.id,
          serviceId: addonId,
          priceAtBookingCents: pricing.priceCents,
        });
      }

      // appointmentBundles
      if (pb.bundleId && pb.discountAppliedCents) {
        await tx.insert(appointmentBundles).values({
          appointmentPetId: appointmentPetId.id,
          bundleId: pb.bundleId,
          discountAppliedCents: pb.discountAppliedCents,
        });
      }
    }

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
