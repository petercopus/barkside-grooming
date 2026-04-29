import { and, desc, eq, gt, inArray, lt, notInArray } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '~~/server/db';
import {
  appointmentAddons,
  appointmentBundles,
  appointmentPets,
  appointments,
  appointmentServices,
  bundles,
  bundleServices,
  documentRequests,
  documents,
  guestDetails,
  pets,
  petSizeCategories,
  servicePricing,
  services,
  users,
} from '~~/server/db/schema';
import { calcBundleDiscount } from '~~/server/services/bundle.service';
import { resolveSizeCategory } from '~~/server/services/pet.service';
import { sendVaccinationHoldEmail } from '~~/server/services/vaccination-email.service';
import {
  calcHoldExpiry,
  hashUploadToken,
  type IssuedUploadToken,
  SATISFYING_VAX_STATUSES,
} from '~~/server/services/vaccination-hold.service';
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

function groupBy<T, K>(rows: T[], keyFn: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

export async function enrichAppointments(appointmentRows: (typeof appointments.$inferSelect)[]) {
  if (appointmentRows.length === 0) return [];

  const appointmentIds = appointmentRows.map((ar) => ar.id);
  const customerIds = [
    ...new Set(appointmentRows.map((ar) => ar.customerId).filter(Boolean)),
  ] as string[];
  const guestApptIds = appointmentRows.filter((ar) => !ar.customerId).map((ar) => ar.id);

  const petRows = await db
    .select()
    .from(appointmentPets)
    .leftJoin(pets, eq(appointmentPets.petId, pets.id))
    .where(inArray(appointmentPets.appointmentId, appointmentIds));

  const petIds = petRows.map((pr) => pr.appointment_pets.id);
  const groomerIds = [
    ...new Set(petRows.map((pr) => pr.appointment_pets.assignedGroomerId).filter(Boolean)),
  ] as string[];

  const [serviceRows, addonRows, bundleRows, customerRows, guestDetailRows, groomerRows] =
    await Promise.all([
      petIds.length
        ? db
            .select()
            .from(appointmentServices)
            .innerJoin(services, eq(appointmentServices.serviceId, services.id))
            .where(inArray(appointmentServices.appointmentPetId, petIds))
        : Promise.resolve([]),
      petIds.length
        ? db
            .select()
            .from(appointmentAddons)
            .innerJoin(services, eq(appointmentAddons.serviceId, services.id))
            .where(inArray(appointmentAddons.appointmentPetId, petIds))
        : Promise.resolve([]),
      petIds.length
        ? db
            .select()
            .from(appointmentBundles)
            .innerJoin(bundles, eq(appointmentBundles.bundleId, bundles.id))
            .where(inArray(appointmentBundles.appointmentPetId, petIds))
        : Promise.resolve([]),
      customerIds.length
        ? db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              phone: users.phone,
            })
            .from(users)
            .where(inArray(users.id, customerIds))
        : Promise.resolve([]),
      guestApptIds.length
        ? db.select().from(guestDetails).where(inArray(guestDetails.appointmentId, guestApptIds))
        : Promise.resolve([]),
      groomerIds.length
        ? db
            .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(inArray(users.id, groomerIds))
        : Promise.resolve([]),
    ]);

  const customerById = new Map(customerRows.map((c) => [c.id, c]));
  const guestByApptId = new Map(guestDetailRows.map((g) => [g.appointmentId, g]));
  const groomerById = new Map(groomerRows.map((g) => [g.id, g]));
  const petsByApptId = groupBy(petRows, (pr) => pr.appointment_pets.appointmentId);
  const servicesByPetId = groupBy(serviceRows, (sr) => sr.appointment_services.appointmentPetId);
  const addonsByPetId = groupBy(addonRows, (ar) => ar.appointment_addons.appointmentPetId);
  const bundlesByPetId = groupBy(bundleRows, (br) => br.appointment_bundles.appointmentPetId);

  return appointmentRows.map((appt) => {
    const customer = appt.customerId ? customerById.get(appt.customerId) : undefined;
    const guest = guestByApptId.get(appt.id);

    return {
      ...appt,
      customerName: customer
        ? formatFullName(customer.firstName, customer.lastName, 'Guest')
        : guest
          ? formatFullName(guest.firstName, guest.lastName, 'Guest')
          : 'Guest',
      phone: customer?.phone ?? guest?.phone ?? null,
      guestDetails: guest ?? null,
      pets: (petsByApptId.get(appt.id) ?? []).map((pr) => ({
        ...pr.appointment_pets,
        petName: pr.pets?.name ?? pr.appointment_pets.guestPetName ?? 'Guest Pet',
        petBreed: pr.pets?.breed ?? pr.appointment_pets.guestPetBreed ?? null,
        assignedGroomerName: pr.appointment_pets.assignedGroomerId
          ? (() => {
              const g = groomerById.get(pr.appointment_pets.assignedGroomerId);
              return g ? formatFullName(g.firstName, g.lastName) : null;
            })()
          : null,
        services: (servicesByPetId.get(pr.appointment_pets.id) ?? []).map((sr) => ({
          ...sr.appointment_services,
          serviceName: sr.services.name,
        })),
        addons: (addonsByPetId.get(pr.appointment_pets.id) ?? []).map((ar) => ({
          ...ar.appointment_addons,
          serviceName: ar.services.name,
        })),
        bundles: (bundlesByPetId.get(pr.appointment_pets.id) ?? []).map((br) => ({
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
  const result = await db.transaction(async (tx) => {
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

        const discountCents = calcBundleDiscount(
          bundle.discountType,
          bundle.discountValue,
          bundleTotal,
        );

        await tx.insert(appointmentBundles).values({
          appointmentPetId: appointmentPetId.id,
          bundleId: pb.bundleId,
          discountAppliedCents: discountCents,
        });
      }
    }

    const earliestApptStart = petBookings.reduce<Date>(
      (earliest, pb) => {
        const candidate = new Date(`${pb.scheduledDate}T${pb.startTime}`);
        return candidate < earliest ? candidate : earliest;
      },
      new Date(`${petBookings[0]!.scheduledDate}T${petBookings[0]!.startTime}`),
    );

    /* ─── Vaccination hold assessment ─── */
    const apptPetRows = await tx
      .select({
        id: appointmentPets.id,
        petId: appointmentPets.petId,
        guestPetName: appointmentPets.guestPetName,
      })
      .from(appointmentPets)
      .where(eq(appointmentPets.appointmentId, appointmentId.id));

    const registeredPetIds = apptPetRows
      .map((r) => r.petId)
      .filter((id): id is string => id !== null);

    const existingDocRows = registeredPetIds.length
      ? await tx
          .select({ petId: documents.petId })
          .from(documents)
          .where(
            and(
              inArray(documents.petId, registeredPetIds),
              eq(documents.type, 'vaccination_record'),
              inArray(documents.status, [...SATISFYING_VAX_STATUSES]),
            ),
          )
      : [];
    const petsWithDocs = new Set(existingDocRows.map((r) => r.petId).filter(Boolean) as string[]);

    const missingApptPets = apptPetRows.filter(
      (ap) => ap.petId === null || !petsWithDocs.has(ap.petId),
    );

    if (missingApptPets.length === 0) {
      await tx
        .update(appointments)
        .set({ status: 'confirmed', updatedAt: new Date() })
        .where(eq(appointments.id, appointmentId.id));
      await tx
        .update(appointmentPets)
        .set({ status: 'confirmed' })
        .where(eq(appointmentPets.appointmentId, appointmentId.id));
      return { id: appointmentId.id, holdTokens: [] as IssuedUploadToken[] };
    }

    const expiresAt = calcHoldExpiry({ isGuest: false, earliestApptStart });
    await tx
      .update(appointments)
      .set({
        status: 'pending_documents',
        documentsHoldExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId.id));

    await tx
      .update(appointmentPets)
      .set({ status: 'pending_documents' })
      .where(eq(appointmentPets.appointmentId, appointmentId.id));

    const petNameById = new Map<string, string>();
    if (registeredPetIds.length > 0) {
      const petRows = await tx
        .select({ id: pets.id, name: pets.name })
        .from(pets)
        .where(inArray(pets.id, registeredPetIds));
      for (const p of petRows) petNameById.set(p.id, p.name);
    }

    const holdTokens: IssuedUploadToken[] = [];
    for (const ap of missingApptPets) {
      const token = randomUUID();
      const displayName = ap.petId
        ? (petNameById.get(ap.petId) ?? 'Pet')
        : (ap.guestPetName ?? 'Pet');
      await tx.insert(documentRequests).values({
        requestedByUserId: null,
        targetUserId: customerId,
        petId: ap.petId,
        appointmentId: appointmentId.id,
        appointmentPetId: ap.id,
        documentType: 'vaccination_record',
        status: 'pending',
        tokenHash: hashUploadToken(token),
        expiresAt,
      });
      holdTokens.push({ appointmentPetId: ap.id, displayName, token });
    }

    return { id: appointmentId.id, holdTokens };
  });

  if (result.holdTokens.length > 0) {
    sendVaccinationHoldEmail(result.id, result.holdTokens).catch((err) =>
      console.error('[booking] vaccination hold email failed:', err),
    );
  }

  const [apptRow] = await db.select().from(appointments).where(eq(appointments.id, result.id));
  if (!apptRow) throw new Error('Appointment not found after creation');
  const [enriched] = await enrichAppointments([apptRow]);
  return enriched!;
}

/**
 * Book a guest appointment (single pet, no account)
 */
export async function createGuestBooking(input: CreateGuestBookingInput) {
  const result = await db.transaction(async (tx) => {
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

      const discountCents = calcBundleDiscount(
        bundle.discountType,
        bundle.discountValue,
        bundleTotal,
      );

      await tx.insert(appointmentBundles).values({
        appointmentPetId: appointmentPetId.id,
        bundleId: pet.bundleId,
        discountAppliedCents: discountCents,
      });
    }

    /* ─── Vaccination hold (guest pets always require upload) ─── */
    const expiresAt = calcHoldExpiry({
      isGuest: true,
      earliestApptStart: new Date(`${pet.scheduledDate}T${pet.startTime}`),
    });

    await tx
      .update(appointments)
      .set({
        status: 'pending_documents',
        documentsHoldExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId.id));
    await tx
      .update(appointmentPets)
      .set({ status: 'pending_documents' })
      .where(eq(appointmentPets.appointmentId, appointmentId.id));

    const token = randomUUID();
    await tx.insert(documentRequests).values({
      requestedByUserId: null,
      targetUserId: null,
      petId: null,
      appointmentId: appointmentId.id,
      appointmentPetId: appointmentPetId.id,
      documentType: 'vaccination_record',
      status: 'pending',
      tokenHash: hashUploadToken(token),
      expiresAt,
    });

    const holdTokens: IssuedUploadToken[] = [
      { appointmentPetId: appointmentPetId.id, displayName: pet.name, token },
    ];
    return { id: appointmentId.id, holdTokens };
  });

  // Enrich the Stripe customer with real contact details now that booking is committed
  if (input.stripeCustomerId) {
    try {
      await updateStripeCustomer(input.stripeCustomerId, {
        email: input.guestDetails.email,
        name: formatFullName(input.guestDetails.firstName, input.guestDetails.lastName),
      });
    } catch (err) {
      console.error('[stripe] Failed to enrich guest customer:', err);
    }
  }

  if (result.holdTokens.length > 0) {
    sendVaccinationHoldEmail(result.id, result.holdTokens).catch((err) =>
      console.error('[booking] vaccination hold email failed:', err),
    );
  }

  const [apptRow] = await db.select().from(appointments).where(eq(appointments.id, result.id));
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
  if (!['pending', 'pending_documents', 'confirmed'].includes(booking!.status)) {
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
