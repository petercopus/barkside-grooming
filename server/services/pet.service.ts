import { and, eq, inArray } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointmentPets, appointments, pets, petSizeCategories, users } from '~~/server/db/schema';
import { enrichAppointments } from '~~/server/services/appointment.service';
import type { CreatePetInput, UpdatePetInput } from '~~/shared/schemas/pet';

async function resolveSizeCategory(weightLbs: number | undefined): Promise<number | null> {
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

  // Soft delete for now by setting is_active=false
  // TODO: scheduled appointment canceling logic. Cannot set pet to inactive if there are open appointments
  await db.update(pets).set({ isActive: false, updatedAt: new Date() }).where(eq(pets.id, petId));
}

//#region ADMIN
export async function listAllPets() {
  return db
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
    .leftJoin(users, eq(pets.ownerId, users.id));
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

  // fetch appointment history for this pet
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
