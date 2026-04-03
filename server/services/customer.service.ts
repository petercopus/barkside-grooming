import { and, count, eq, ilike, inArray, max, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments, pets, roles, userRoles, users } from '~~/server/db/schema';
import { listBookings } from '~~/server/services/appointment.service';
import type { UpdateCustomerInput } from '~~/shared/schemas/customer';

/**
 * List all users that only have the 'customer' role
 * - Optionally pass a search string
 */
export async function listCustomers(search?: string) {
  // 1. Find users with the Customer role
  const conditions = [eq(roles.name, 'Customer')];

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
        ilike(users.email, pattern),
        ilike(users.phone, pattern),
      )!,
    );
  }

  const customerRows = await db
    .select()
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(...conditions));

  // dedup
  const seen = new Set<string>();
  const uqCustomers = customerRows
    .filter((r) => {
      if (seen.has(r.users.id)) return false;
      seen.add(r.users.id);
      return true;
    })
    .map((r) => r.users);

  if (uqCustomers.length === 0) return [];

  const customerIds = uqCustomers.map((c) => c.id);

  // 2. Batch pet counts
  const petCounts = await db
    .select({ ownerId: pets.ownerId, petCount: count() })
    .from(pets)
    .where(and(inArray(pets.ownerId, customerIds), eq(pets.isActive, true)))
    .groupBy(pets.ownerId);

  // 3. Batch last appointment dtes
  const lastAppointments = await db
    .select({ customerId: appointments.customerId, lastDate: max(appointments.createdAt) })
    .from(appointments)
    .where(inArray(appointments.customerId, customerIds))
    .groupBy(appointments.customerId);

  // 4. Merge
  return uqCustomers.map((user) => ({
    ...stripPassword(user),
    petCount: petCounts.find((p) => p.ownerId === user.id)?.petCount ?? 0,
    lastAppointment: lastAppointments.find((a) => a.customerId === user.id)?.lastDate ?? null,
  }));
}

export async function getCustomer(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));

  if (!user) {
    throw createError({ statusCode: 404, message: 'Customer not found' });
  }

  return stripPassword(user);
}

export async function getCustomerWithRelations(id: string) {
  const customer = await getCustomer(id);
  const customerPets = await db.select().from(pets).where(eq(pets.ownerId, id));
  const customerAppointments = await listBookings(id);

  return {
    ...customer,
    pets: customerPets,
    appointments: customerAppointments,
  };
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomer(id);

  const [updated] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return stripPassword(updated!);
}
