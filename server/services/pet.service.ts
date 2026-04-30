import { and, eq, ilike, inArray, max, notInArray, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, appointments, pets, petSizeCategories, users } from '~~/server/db/schema';
import { enrichAppointments } from '~~/server/services/appointment.service';
import type { CreatePetInput, UpdatePetInput } from '~~/shared/schemas/pet';

export async function resolveSizeCategory(weightLbs: number | undefined): Promise<number | null> {
  if (!weightLbs) return null;

  // fetch and sort by minWeight
  const categories = await db.select().from(petSizeCategories).orderBy(petSizeCategories.minWeight);

  // since we sorted by min weight, the first match will be the best categorization
  const match = categories.find((cat) => cat.minWeight && weightLbs <= cat.maxWeight);
  return match?.id ?? null;
}

export async function listPets(ownerId: string) {
  return db
    .select()
    .from(pets)
    .where(and(eq(pets.ownerId, ownerId), eq(pets.isActive, true)));
}

export async function getPet(petId: string, ownerId: string) {
  const [pet] = await db
    .select()
    .from(pets)
    .where(and(eq(pets.id, petId), eq(pets.ownerId, ownerId)));

  if (!pet) {
    throw createError({ statusCode: 404, message: 'Pet not found' });
  }

  return pet;
}

export async function createPet(ownerId: string, input: CreatePetInput) {
  // possible that input.weightLbs is undefined. If so, sizeCategoryId is null.
  const sizeCategoryId = await resolveSizeCategory(input.weightLbs);

  const [pet] = await db
    .insert(pets)
    .values({
      ownerId,
      name: input.name,
      breed: input.breed,
      weightLbs: input.weightLbs,
      sizeCategoryId,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      coatType: input.coatType,
      specialNotes: input.specialNotes,
    })
    .returning();

  return pet;
}

export async function updatePet(petId: string, ownerId: string, input: UpdatePetInput) {
  // Verify ownership. getPet throws 404 if no match on (petId, ownerId)
  await getPet(petId, ownerId);

  // re-resolve size category if weight changed
  // TODO [1-1]: Business rules: allow user to update their own pet weight after initial creation? Or only allow business to change this?
  const sizeCategoryId =
    input.weightLbs !== undefined ? await resolveSizeCategory(input.weightLbs) : undefined;

  const values: Record<string, any> = { ...input, updatedAt: new Date() };

  // TODO [1-2]: see TODO [1-1]
  if (sizeCategoryId !== undefined) {
    values.sizeCategoryId = sizeCategoryId;
  }

  const [updated] = await db.update(pets).set(values).where(eq(pets.id, petId)).returning();

  return updated;
}

export async function deletePet(petId: string, ownerId: string) {
  // verify ownership
  await getPet(petId, ownerId);

  const [openAppt] = await db
    .select({ id: appointmentPets.appointmentId })
    .from(appointmentPets)
    .where(
      and(
        eq(appointmentPets.petId, petId),
        notInArray(appointmentPets.status, ['cancelled', 'no_show', 'completed']),
      ),
    )
    .limit(1);

  // block delete while the pet still has open appointments
  if (openAppt) {
    throw createError({
      statusCode: 409,
      message: 'This pet has upcoming appointments. Cancel them before removing the pet.',
    });
  }

  await db.update(pets).set({ isActive: false, updatedAt: new Date() }).where(eq(pets.id, petId));
}

//#region ADMIN
export async function updatePetAsAdmin(petId: string, input: UpdatePetInput) {
  const [existing] = await db.select().from(pets).where(eq(pets.id, petId));
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Pet not found' });
  }

  const sizeCategoryId =
    input.weightLbs !== undefined ? await resolveSizeCategory(input.weightLbs) : undefined;

  const values: Record<string, any> = { ...input, updatedAt: new Date() };
  if (sizeCategoryId !== undefined) {
    values.sizeCategoryId = sizeCategoryId;
  }

  const [updated] = await db.update(pets).set(values).where(eq(pets.id, petId)).returning();
  return updated;
}

export async function listAllPets(search?: string) {
  const conditions = [];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(pets.name, pattern),
        ilike(pets.breed, pattern),
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
      )!,
    );
  }

  const rows = await db
    .select({
      id: pets.id,
      name: pets.name,
      breed: pets.breed,
      weightLbs: pets.weightLbs,
      sizeCategoryId: pets.sizeCategoryId,
      dateOfBirth: pets.dateOfBirth,
      gender: pets.gender,
      coatType: pets.coatType,
      specialNotes: pets.specialNotes,
      isActive: pets.isActive,
      ownerId: pets.ownerId,
      ownerFirstName: users.firstName,
      ownerLastName: users.lastName,
    })
    .from(pets)
    .leftJoin(users, eq(pets.ownerId, users.id))
    .where(and(...conditions));

  if (rows.length === 0) return [];

  // Batch: last scheduled appointment per pet
  const petIds = rows.map((r) => r.id);
  const lastAppointments = await db
    .select({ petId: appointmentPets.petId, lastDate: max(appointmentPets.scheduledDate) })
    .from(appointmentPets)
    .where(inArray(appointmentPets.petId, petIds))
    .groupBy(appointmentPets.petId);

  const lastByPetId = new Map(lastAppointments.map((a) => [a.petId, a.lastDate]));

  return rows.map((row) => ({
    ...row,
    lastAppointment: lastByPetId.get(row.id) ?? null,
  }));
}

export async function getAdminPet(petId: string) {
  const [row] = await db
    .select({
      id: pets.id,
      name: pets.name,
      breed: pets.breed,
      weightLbs: pets.weightLbs,
      sizeCategoryId: pets.sizeCategoryId,
      dateOfBirth: pets.dateOfBirth,
      gender: pets.gender,
      coatType: pets.coatType,
      specialNotes: pets.specialNotes,
      isActive: pets.isActive,
      ownerId: pets.ownerId,
      ownerFirstName: users.firstName,
      ownerLastName: users.lastName,
    })
    .from(pets)
    .leftJoin(users, eq(pets.ownerId, users.id))
    .where(eq(pets.id, petId));

  if (!row) {
    throw createError({ statusCode: 404, message: 'Pet not found' });
  }

  const petAppointmentRows = await db
    .selectDistinct({ appointmentId: appointmentPets.appointmentId })
    .from(appointmentPets)
    .where(eq(appointmentPets.petId, petId));

  const apptIds = petAppointmentRows.map((r) => r.appointmentId);

  let petAppointments: Awaited<ReturnType<typeof enrichAppointments>> = [];
  if (apptIds.length > 0) {
    const apptRows = await db.select().from(appointments).where(inArray(appointments.id, apptIds));
    petAppointments = await enrichAppointments(apptRows);
  }

  return {
    ...row,
    owner: { id: row.ownerId, firstName: row.ownerFirstName, lastName: row.ownerLastName },
    appointments: petAppointments,
  };
}
//#endregion
