import { and, count, eq, ilike, inArray, max, ne, or } from 'drizzle-orm';
import { db } from '~~/server/db';
import { appointments, pets, roles, userRoles, users } from '~~/server/db/schema';
import { listBookings } from '~~/server/services/appointment.service';
import type { CreateCustomerInput, UpdateCustomerInput } from '~~/shared/schemas/customer';

export async function listCustomers(search?: string) {
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

  const [petCounts, lastAppointments] = await Promise.all([
    db
      .select({ ownerId: pets.ownerId, petCount: count() })
      .from(pets)
      .where(and(inArray(pets.ownerId, customerIds), eq(pets.isActive, true)))
      .groupBy(pets.ownerId),
    db
      .select({ customerId: appointments.customerId, lastDate: max(appointments.createdAt) })
      .from(appointments)
      .where(inArray(appointments.customerId, customerIds))
      .groupBy(appointments.customerId),
  ]);

  const petCountByOwner = new Map(petCounts.map((p) => [p.ownerId, p.petCount]));
  const lastApptByCustomer = new Map(lastAppointments.map((a) => [a.customerId, a.lastDate]));

  return uqCustomers.map((user) => ({
    ...stripPassword(user),
    name: formatFullName(user.firstName, user.lastName),
    petCount: petCountByOwner.get(user.id) ?? 0,
    lastAppointment: lastApptByCustomer.get(user.id) ?? null,
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
  const [customer, customerPets, customerAppointments] = await Promise.all([
    getCustomer(id),
    db.select().from(pets).where(eq(pets.ownerId, id)),
    listBookings(id),
  ]);

  return {
    ...customer,
    pets: customerPets,
    appointments: customerAppointments,
  };
}

export async function createCustomer(input: CreateCustomerInput) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw createError({ statusCode: 409, message: 'Email already registered' });
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
    })
    .returning();

  if (!user) {
    throw createError({ statusCode: 500, message: 'Failed to create customer' });
  }

  const [customerRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'Customer'))
    .limit(1);

  if (customerRole) {
    await db.insert(userRoles).values({ userId: user.id, roleId: customerRole.id });
  }

  return stripPassword(user);
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await getCustomer(id);

  if (input.email) {
    const [conflict] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, input.email), ne(users.id, id)))
      .limit(1);

    if (conflict) {
      throw createError({ statusCode: 409, message: 'Email already in use' });
    }
  }

  const [updated] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();

  return stripPassword(updated!);
}
