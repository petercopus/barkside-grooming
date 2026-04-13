import { and, desc, eq, gt, inArray, lt, notInArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import {
  appointmentAddons,
  appointmentBundles,
  appointmentPets,
  appointments,
  appointmentServices,
  bundles,
  bundleServices,
  guestDetails,
  pets,
  petSizeCategories,
  servicePricing,
  services,
  users,
} from '~~/server/db/schema';
import { resolveSizeCategory } from '~~/server/services/pet.service';
import { minutesToTime, timeToMinutes } from '~~/server/utils/date';
import type { CreateBookingInput, CreateGuestBookingInput } from '~~/shared/schemas/appointment';

function resolvePricing(
  serviceIds: number[],
  pricingRows: (typeof servicePricing.$inferSelect)[],
  sizeCategoryId: number | null,
  label: string,
) {
  return serviceIds.map((svcId) => {
    const pricing = pricingRows.find(
      (pr) => pr.serviceId === svcId && pr.sizeCategoryId === sizeCategoryId,
    );

    if (!pricing) {
      throw createError({
        statusCode: 400,
        message: `No pricing found for ${label} ${svcId} at size ${sizeCategoryId}`,
      });
    }

    return pricing;
  });
}

/**
 * Batch load pets, services, customer for a set of appointments
 *
 * Avoid N+1 by fetching all related rows in two batches then group in JS
 */
export async function enrichAppointments(appointmentRows: (typeof appointments.$inferSelect)[]) {
  if (appointmentRows.length === 0) return [];

  const appointmentIds = appointmentRows.map((ar) => ar.id);

  const petRows = await db
    .select()
    .from(appointmentPets)
    .leftJoin(pets, eq(appointmentPets.petId, pets.id))
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

  // load guest details for guest bookings
  const guestApptIds = appointmentRows.filter((ar) => !ar.customerId).map((ar) => ar.id);

  const guestDetailRows =
    guestApptIds.length > 0
      ? await db
          .select()
          .from(guestDetails)
          .where(inArray(guestDetails.appointmentId, guestApptIds))
      : [];

  return appointmentRows.map((appt) => {
    const customer = customerRows.find((cr) => cr.id === appt.customerId);
    const guest = guestDetailRows.find((gd) => gd.appointmentId === appt.id);

    return {
      ...appt,
      customerName: customer
        ? `${customer.firstName} ${customer.lastName}`
        : guest
          ? `${guest.firstName} ${guest.lastName}`
          : 'Guest',
      guestDetails: guest ?? null,
      pets: petRows
        .filter((pr) => pr.appointment_pets.appointmentId === appt.id)
        .map((pr) => ({
          ...pr.appointment_pets,
          petName: pr.pets?.name ?? pr.appointment_pets.guestPetName ?? 'Guest Pet',
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
  const id = await db.transaction(async (tx) => {
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
      const basePricingRows = resolvePricing(
        p.serviceIds,
        pricingRows,
        pet.sizeCategoryId,
        'service',
      );

      // Pricing for addons
      const addonPricingRows = resolvePricing(p.addonIds, pricingRows, pet.sizeCategoryId, 'addon');

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
        paymentMethodId: input.paymentMethodId,
        stripeCustomerId: input.stripeCustomerId,
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
      if (pb.bundleId) {
        const [bundle] = await tx
          .select()
          .from(bundles)
          .where(and(eq(bundles.id, pb.bundleId), eq(bundles.isActive, true)));

        if (!bundle) {
          throw createError({ statusCode: 400, message: `Bundle ${pb.bundleId} not found` });
        }

        // fetch bundle's required services
        const bundleSvcRows = await tx
          .select()
          .from(bundleServices)
          .where(eq(bundleServices.bundleId, bundle.id));
        const bundleServiceIds = bundleSvcRows.map((r) => r.serviceId);

        // verify all bundle services are in the booking
        const allBookedIds = new Set([...pb.serviceIds, ...pb.addonIds]);
        const allPresent = bundleServiceIds.every((id) => allBookedIds.has(id));

        if (!allPresent) {
          throw createError({
            statusCode: 400,
            message: 'Selected services fo not match bundle requirements',
          });
        }

        // recompute discount from bundle definition
        const bundleTotal = bundleServiceIds.reduce((sum, svcId) => {
          const pricing = [...pb.basePricingRows, ...pb.addonPricingRows].find(
            (pr) => pr.serviceId === svcId,
          );

          return sum + (pricing?.priceCents ?? 0);
        }, 0);

        const discountCents =
          bundle.discountType === 'percent'
            ? Math.round(bundleTotal * (bundle.discountValue / 100))
            : bundle.discountValue;

        await tx.insert(appointmentBundles).values({
          appointmentPetId: appointmentPetId.id,
          bundleId: pb.bundleId,
          discountAppliedCents: discountCents,
        });
      }
    }

    return appointmentId.id;
  });

  const [apptRow] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!apptRow) throw new Error('Appointment not found after creation');
  const [enriched] = await enrichAppointments([apptRow]);
  return enriched!;
}

/**
 * Book a guest appointment (single pet, no account)
 */
export async function createGuestBooking(input: CreateGuestBookingInput) {
  const id = await db.transaction(async (tx) => {
    const pet = input.pet;

    // 1. Resolve size category from weight
    const sizeCategoryId = await resolveSizeCategory(pet.weightLbs);

    // look up the size category name for storage on appointmentPets
    let sizeCategoryName: string | null = null;
    if (sizeCategoryId) {
      const [cat] = await tx
        .select({ name: petSizeCategories.name })
        .from(petSizeCategories)
        .where(eq(petSizeCategories.id, sizeCategoryId));
      sizeCategoryName = cat?.name ?? null;
    }

    // 2. Resolve pricing
    const allServiceIds = [...new Set([...pet.serviceIds, ...pet.addonIds])];

    const pricingRows = await tx
      .select()
      .from(servicePricing)
      .where(inArray(servicePricing.serviceId, allServiceIds));

    const basePricingRows = resolvePricing(pet.serviceIds, pricingRows, sizeCategoryId, 'service');
    const addonPricingRows = resolvePricing(pet.addonIds, pricingRows, sizeCategoryId, 'addon');

    // 3. Calculate duration & end time
    const totalDuration =
      basePricingRows.reduce((sum, pr) => sum + pr.durationMinutes, 0) +
      addonPricingRows.reduce((sum, pr) => sum + pr.durationMinutes, 0);

    const startMinutes = timeToMinutes(pet.startTime);
    const endMinutes = startMinutes + totalDuration;
    const endTime = minutesToTime(endMinutes);

    // 4. Check groomer conflicts
    const conflicts = await tx
      .select({ id: appointmentPets.id })
      .from(appointmentPets)
      .where(
        and(
          eq(appointmentPets.assignedGroomerId, pet.groomerId),
          eq(appointmentPets.scheduledDate, pet.scheduledDate),
          notInArray(appointmentPets.status, ['cancelled', 'no_show']),
          lt(appointmentPets.startTime, endTime),
          gt(appointmentPets.endTime, pet.startTime),
        ),
      )
      .limit(1);

    if (conflicts.length > 0) {
      throw createError({
        statusCode: 409,
        message: `Time slot ${pet.startTime}-${endTime} is no longer available`,
      });
    }

    // 5. Insert appointment (no customer)
    const [appointmentId] = await tx
      .insert(appointments)
      .values({
        notes: input.notes,
        paymentMethodId: input.paymentMethodId,
        stripeCustomerId: input.stripeCustomerId,
      })
      .returning({ id: appointments.id });

    if (!appointmentId) {
      throw createError({ statusCode: 400, message: 'Failed to create appointment' });
    }

    // 6. Insert guest details
    await tx.insert(guestDetails).values({
      appointmentId: appointmentId.id,
      firstName: input.guestDetails.firstName,
      lastName: input.guestDetails.lastName,
      email: input.guestDetails.email,
      phone: input.guestDetails.phone,
      emergencyContactName: input.guestDetails.emergencyContactName,
      emergencyContactPhone: input.guestDetails.emergencyContactPhone,
    });

    // 7. Insert appointmentPets with guest pet fields
    const [appointmentPetId] = await tx
      .insert(appointmentPets)
      .values({
        appointmentId: appointmentId.id,
        petId: null,
        guestPetName: pet.name,
        guestPetBreed: pet.breed ?? null,
        guestPetWeight: pet.weightLbs ?? null,
        guestPetSizeCategory: sizeCategoryName,
        assignedGroomerId: pet.groomerId,
        scheduledDate: pet.scheduledDate,
        startTime: pet.startTime,
        endTime,
        estimatedDurationMinutes: totalDuration,
      })
      .returning({ id: appointmentPets.id });

    if (!appointmentPetId) {
      throw createError({ statusCode: 400, message: 'Failed to create appointmentPets' });
    }

    // 8. Insert services
    for (const svcId of pet.serviceIds) {
      const pricing = basePricingRows.find((pr) => pr.serviceId === svcId)!;
      await tx.insert(appointmentServices).values({
        appointmentPetId: appointmentPetId.id,
        serviceId: svcId,
        priceAtBookingCents: pricing.priceCents,
        durationAtBookingMinutes: pricing.durationMinutes,
      });
    }

    // Insert addons
    for (const addonId of pet.addonIds) {
      const pricing = addonPricingRows.find((pr) => pr.serviceId === addonId)!;
      await tx.insert(appointmentAddons).values({
        appointmentPetId: appointmentPetId.id,
        serviceId: addonId,
        priceAtBookingCents: pricing.priceCents,
      });
    }

    // Insert bundle (if selected)
    if (pet.bundleId) {
      const [bundle] = await tx
        .select()
        .from(bundles)
        .where(and(eq(bundles.id, pet.bundleId), eq(bundles.isActive, true)));

      if (!bundle) {
        throw createError({ statusCode: 400, message: `Bundle ${pet.bundleId} not found` });
      }

      const bundleSvcRows = await tx
        .select()
        .from(bundleServices)
        .where(eq(bundleServices.bundleId, bundle.id));
      const bundleServiceIds = bundleSvcRows.map((r) => r.serviceId);

      const allBookedIds = new Set([...pet.serviceIds, ...pet.addonIds]);
      const allPresent = bundleServiceIds.every((id) => allBookedIds.has(id));

      if (!allPresent) {
        throw createError({
          statusCode: 400,
          message: 'Selected services do not match bundle requirements',
        });
      }

      const bundleTotal = bundleServiceIds.reduce((sum, svcId) => {
        const pricing = [...basePricingRows, ...addonPricingRows].find(
          (pr) => pr.serviceId === svcId,
        );
        return sum + (pricing?.priceCents ?? 0);
      }, 0);

      const discountCents =
        bundle.discountType === 'percent'
          ? Math.round(bundleTotal * (bundle.discountValue / 100))
          : bundle.discountValue;

      await tx.insert(appointmentBundles).values({
        appointmentPetId: appointmentPetId.id,
        bundleId: pet.bundleId,
        discountAppliedCents: discountCents,
      });
    }

    return appointmentId.id;
  });

  const [apptRow] = await db.select().from(appointments).where(eq(appointments.id, id));
  if (!apptRow) throw new Error('Appointment not found after creation');
  const [enriched] = await enrichAppointments([apptRow]);
  return enriched!;
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
