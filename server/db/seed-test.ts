/**
 * AI ASSISTED WITH CREATING THIS SEED DATA
 *
 * Test data seed for reporting development.
 * Run AFTER the base seed (db:seed) — depends on roles, permissions, services, etc.
 *
 * Creates: customers, employees, pets, employee schedules, appointments
 * (with services/addons), invoices, invoice line items, and payments
 * spread over the last 90 days.
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../utils/password';
import { db } from './index';
import {
  appointmentAddons,
  appointmentPets,
  appointmentServices,
  appointments,
  employeeSchedules,
  employeeServices,
  invoiceLineItems,
  invoices,
  payments,
  petSizeCategories,
  pets,
  roles,
  services,
  userRoles,
  users,
} from './schema';

// ─── Helpers ─────────────────────────────────────────────

/** Returns a Date that is `daysAgo` days before today, at noon UTC. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** ISO date string (YYYY-MM-DD) for `daysAgo` days before today. */
function dateAgo(n: number): string {
  return daysAgo(n).toISOString().split('T')[0];
}

/** Add minutes to a HH:MM time string, returning HH:MM. */
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

async function seedTestData() {
  console.log('🧪 Seeding test data for reports...\n');

  // ─── Lookup existing reference data ────────────────────
  const allRoles = await db.select().from(roles);
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

  const allSizes = await db.select().from(petSizeCategories);
  const sizeMap = Object.fromEntries(allSizes.map((s) => [s.name, s.id]));

  const allServices = await db.select().from(services);
  const svcMap = Object.fromEntries(allServices.map((s) => [s.name, s.id]));
  const svcLookup = Object.fromEntries(allServices.map((s) => [s.id, s]));

  if (!roleMap['Customer'] || !roleMap['Groomer'] || !roleMap['Bather']) {
    throw new Error('Missing roles — run the base seed first (npm run db:seed)');
  }
  if (Object.keys(svcMap).length === 0) {
    throw new Error('Missing services — run the base seed first (npm run db:seed)');
  }

  const passwordHash = await hashPassword('password123');

  // ─── 1. Employees ──────────────────────────────────────
  const employeeData = [
    {
      email: 'jessica@barkside.com',
      firstName: 'Jessica',
      lastName: 'Taylor',
      phone: '555-100-0001',
      role: 'Groomer',
    },
    {
      email: 'ryan@barkside.com',
      firstName: 'Ryan',
      lastName: 'Garcia',
      phone: '555-100-0002',
      role: 'Groomer',
    },
    {
      email: 'amanda@barkside.com',
      firstName: 'Amanda',
      lastName: 'White',
      phone: '555-100-0003',
      role: 'Bather',
    },
  ];

  const employeeIds: Record<string, string> = {};

  for (const emp of employeeData) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emp.email))
      .limit(1);
    if (existing.length > 0) {
      employeeIds[emp.email] = existing[0].id;
      continue;
    }
    const [user] = await db
      .insert(users)
      .values({
        email: emp.email,
        passwordHash,
        firstName: emp.firstName,
        lastName: emp.lastName,
        phone: emp.phone,
      })
      .returning();
    employeeIds[emp.email] = user.id;
    await db
      .insert(userRoles)
      .values({ userId: user.id, roleId: roleMap[emp.role] })
      .onConflictDoNothing();
    // Also give them Employee role (parent)
    await db
      .insert(userRoles)
      .values({ userId: user.id, roleId: roleMap['Employee'] })
      .onConflictDoNothing();
  }

  console.log('✓ Employees seeded');

  // ─── 2. Employee Schedules (Mon-Sat) ───────────────────
  // Jessica: Mon-Fri 8am-4pm
  // Ryan: Mon-Sat 9am-5pm
  // Amanda: Tue-Sat 8am-3pm
  const scheduleData = [
    { email: 'jessica@barkside.com', days: [1, 2, 3, 4, 5], start: '08:00', end: '16:00' },
    { email: 'ryan@barkside.com', days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '17:00' },
    { email: 'amanda@barkside.com', days: [2, 3, 4, 5, 6], start: '08:00', end: '15:00' },
  ];

  for (const sched of scheduleData) {
    const userId = employeeIds[sched.email];
    for (const day of sched.days) {
      await db
        .insert(employeeSchedules)
        .values({
          userId,
          dayOfWeek: day,
          startTime: sched.start,
          endTime: sched.end,
          isAvailable: true,
        })
        .onConflictDoNothing();
    }
  }

  // ─── 3. Employee-Service Assignments ───────────────────
  // Groomers can do everything; bather does bath & brush, nail trim, de-shedding
  const groomerServiceNames = [
    'Bath & Brush',
    'Full Groom',
    'Nail Trim',
    'De-shedding Treatment',
    'Teeth Brushing',
    'Cologne Spritz',
    'Nail Painting',
    'Flea & Tick Treatment',
  ];
  const batherServiceNames = ['Bath & Brush', 'Nail Trim', 'De-shedding Treatment'];

  for (const email of ['jessica@barkside.com', 'ryan@barkside.com']) {
    for (const name of groomerServiceNames) {
      if (svcMap[name]) {
        await db
          .insert(employeeServices)
          .values({ userId: employeeIds[email], serviceId: svcMap[name] })
          .onConflictDoNothing();
      }
    }
  }
  for (const name of batherServiceNames) {
    if (svcMap[name]) {
      await db
        .insert(employeeServices)
        .values({ userId: employeeIds['amanda@barkside.com'], serviceId: svcMap[name] })
        .onConflictDoNothing();
    }
  }

  console.log('✓ Employee schedules & services seeded');

  // ─── 4. Customers ──────────────────────────────────────
  const customerData = [
    { email: 'sarah@example.com', firstName: 'Sarah', lastName: 'Johnson', phone: '555-200-0001' },
    { email: 'mike@example.com', firstName: 'Mike', lastName: 'Chen', phone: '555-200-0002' },
    { email: 'emily@example.com', firstName: 'Emily', lastName: 'Davis', phone: '555-200-0003' },
    { email: 'james@example.com', firstName: 'James', lastName: 'Wilson', phone: '555-200-0004' },
    { email: 'lisa@example.com', firstName: 'Lisa', lastName: 'Martinez', phone: '555-200-0005' },
    { email: 'david@example.com', firstName: 'David', lastName: 'Brown', phone: '555-200-0006' },
  ];

  const customerIds: Record<string, string> = {};

  for (const cust of customerData) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cust.email))
      .limit(1);
    if (existing.length > 0) {
      customerIds[cust.email] = existing[0].id;
      continue;
    }
    const [user] = await db
      .insert(users)
      .values({
        email: cust.email,
        passwordHash,
        firstName: cust.firstName,
        lastName: cust.lastName,
        phone: cust.phone,
      })
      .returning();
    customerIds[cust.email] = user.id;
    await db
      .insert(userRoles)
      .values({ userId: user.id, roleId: roleMap['Customer'] })
      .onConflictDoNothing();
  }

  console.log('✓ Customers seeded');

  // ─── 5. Pets ───────────────────────────────────────────
  const petData = [
    // Sarah — 2 pets
    {
      owner: 'sarah@example.com',
      name: 'Buddy',
      breed: 'Golden Retriever',
      weightLbs: 70,
      size: 'large',
      gender: 'male',
      coatType: 'long',
    },
    {
      owner: 'sarah@example.com',
      name: 'Daisy',
      breed: 'Pomeranian',
      weightLbs: 8,
      size: 'small',
      gender: 'female',
      coatType: 'long',
    },
    // Mike — 1 pet
    {
      owner: 'mike@example.com',
      name: 'Max',
      breed: 'Labrador Retriever',
      weightLbs: 75,
      size: 'large',
      gender: 'male',
      coatType: 'short',
    },
    // Emily — 1 pet
    {
      owner: 'emily@example.com',
      name: 'Bella',
      breed: 'Shih Tzu',
      weightLbs: 12,
      size: 'small',
      gender: 'female',
      coatType: 'long',
    },
    // James — 3 pets
    {
      owner: 'james@example.com',
      name: 'Rocky',
      breed: 'German Shepherd',
      weightLbs: 85,
      size: 'xlarge',
      gender: 'male',
      coatType: 'medium',
    },
    {
      owner: 'james@example.com',
      name: 'Luna',
      breed: 'French Bulldog',
      weightLbs: 25,
      size: 'medium',
      gender: 'female',
      coatType: 'short',
    },
    {
      owner: 'james@example.com',
      name: 'Charlie',
      breed: 'Chihuahua',
      weightLbs: 5,
      size: 'small',
      gender: 'male',
      coatType: 'short',
    },
    // Lisa — 1 pet
    {
      owner: 'lisa@example.com',
      name: 'Milo',
      breed: 'Standard Poodle',
      weightLbs: 55,
      size: 'large',
      gender: 'male',
      coatType: 'curly',
    },
    // David — 2 pets
    {
      owner: 'david@example.com',
      name: 'Sadie',
      breed: 'Siberian Husky',
      weightLbs: 50,
      size: 'large',
      gender: 'female',
      coatType: 'long',
    },
    {
      owner: 'david@example.com',
      name: 'Cooper',
      breed: 'Beagle',
      weightLbs: 22,
      size: 'medium',
      gender: 'male',
      coatType: 'short',
    },
  ];

  const petIds: Record<string, string> = {}; // keyed by pet name

  for (const p of petData) {
    const [pet] = await db
      .insert(pets)
      .values({
        ownerId: customerIds[p.owner],
        name: p.name,
        breed: p.breed,
        weightLbs: p.weightLbs,
        sizeCategoryId: sizeMap[p.size],
        gender: p.gender,
        coatType: p.coatType,
      })
      .returning();
    petIds[p.name] = pet.id;
  }

  console.log('✓ Pets seeded (10 pets)');

  // ─── 6. Service pricing lookup ─────────────────────────
  // We need to know the price & duration for a given service + size category.
  const { servicePricing } = await import('./schema');
  const allPricing = await db.select().from(servicePricing);

  const pricingLookup: Record<string, { priceCents: number; durationMinutes: number }> = {};
  for (const p of allPricing) {
    pricingLookup[`${p.serviceId}-${p.sizeCategoryId}`] = {
      priceCents: p.priceCents,
      durationMinutes: p.durationMinutes,
    };
  }

  function getPrice(serviceName: string, sizeName: string) {
    const key = `${svcMap[serviceName]}-${sizeMap[sizeName]}`;
    return pricingLookup[key] || { priceCents: 3000, durationMinutes: 30 };
  }

  // ─── 7. Appointments ──────────────────────────────────
  // ~40 appointments spread over the last 90 days with varied statuses.
  // Each appointment has 1 pet, 1 base service, and optionally an addon.

  interface ApptSpec {
    customerEmail: string;
    petName: string;
    petSize: string;
    serviceName: string;
    addonName?: string;
    groomerEmail: string;
    daysAgo: number;
    startTime: string;
    status: string;
  }

  const apptSpecs: ApptSpec[] = [
    // ─── Week 1 (85-90 days ago) ─── slow start
    {
      customerEmail: 'sarah@example.com',
      petName: 'Buddy',
      petSize: 'large',
      serviceName: 'Full Groom',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 88,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'mike@example.com',
      petName: 'Max',
      petSize: 'large',
      serviceName: 'Bath & Brush',
      addonName: 'Flea & Tick Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 87,
      startTime: '10:00',
      status: 'completed',
    },
    {
      customerEmail: 'emily@example.com',
      petName: 'Bella',
      petSize: 'small',
      serviceName: 'Full Groom',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 85,
      startTime: '11:00',
      status: 'completed',
    },

    // ─── Week 2-3 (70-84 days ago) ─── picking up
    {
      customerEmail: 'james@example.com',
      petName: 'Rocky',
      petSize: 'xlarge',
      serviceName: 'Bath & Brush',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 82,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Luna',
      petSize: 'medium',
      serviceName: 'Nail Trim',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 82,
      startTime: '10:00',
      status: 'completed',
    },
    {
      customerEmail: 'sarah@example.com',
      petName: 'Daisy',
      petSize: 'small',
      serviceName: 'Full Groom',
      addonName: 'Cologne Spritz',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 78,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'david@example.com',
      petName: 'Sadie',
      petSize: 'large',
      serviceName: 'De-shedding Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 76,
      startTime: '13:00',
      status: 'completed',
    },
    {
      customerEmail: 'lisa@example.com',
      petName: 'Milo',
      petSize: 'large',
      serviceName: 'Full Groom',
      addonName: 'Teeth Brushing',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 74,
      startTime: '09:00',
      status: 'cancelled',
    },
    {
      customerEmail: 'mike@example.com',
      petName: 'Max',
      petSize: 'large',
      serviceName: 'Nail Trim',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 72,
      startTime: '08:30',
      status: 'completed',
    },

    // ─── Week 4-5 (56-69 days ago) ─── steady
    {
      customerEmail: 'sarah@example.com',
      petName: 'Buddy',
      petSize: 'large',
      serviceName: 'Bath & Brush',
      addonName: 'Flea & Tick Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 67,
      startTime: '10:00',
      status: 'completed',
    },
    {
      customerEmail: 'emily@example.com',
      petName: 'Bella',
      petSize: 'small',
      serviceName: 'Bath & Brush',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 65,
      startTime: '08:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Charlie',
      petSize: 'small',
      serviceName: 'Full Groom',
      addonName: 'Nail Painting',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 63,
      startTime: '14:00',
      status: 'completed',
    },
    {
      customerEmail: 'david@example.com',
      petName: 'Cooper',
      petSize: 'medium',
      serviceName: 'Bath & Brush',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 61,
      startTime: '09:00',
      status: 'no_show',
    },
    {
      customerEmail: 'lisa@example.com',
      petName: 'Milo',
      petSize: 'large',
      serviceName: 'Bath & Brush',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 59,
      startTime: '11:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Rocky',
      petSize: 'xlarge',
      serviceName: 'Full Groom',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 57,
      startTime: '09:00',
      status: 'completed',
    },

    // ─── Week 6-7 (42-55 days ago) ─── busier
    {
      customerEmail: 'sarah@example.com',
      petName: 'Buddy',
      petSize: 'large',
      serviceName: 'Full Groom',
      addonName: 'Teeth Brushing',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 53,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'sarah@example.com',
      petName: 'Daisy',
      petSize: 'small',
      serviceName: 'Bath & Brush',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 53,
      startTime: '08:00',
      status: 'completed',
    },
    {
      customerEmail: 'mike@example.com',
      petName: 'Max',
      petSize: 'large',
      serviceName: 'Full Groom',
      addonName: 'Cologne Spritz',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 50,
      startTime: '10:00',
      status: 'completed',
    },
    {
      customerEmail: 'david@example.com',
      petName: 'Sadie',
      petSize: 'large',
      serviceName: 'Bath & Brush',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 48,
      startTime: '14:00',
      status: 'completed',
    },
    {
      customerEmail: 'emily@example.com',
      petName: 'Bella',
      petSize: 'small',
      serviceName: 'Nail Trim',
      addonName: 'Nail Painting',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 46,
      startTime: '11:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Luna',
      petSize: 'medium',
      serviceName: 'Bath & Brush',
      addonName: 'Cologne Spritz',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 44,
      startTime: '09:00',
      status: 'cancelled',
    },
    {
      customerEmail: 'lisa@example.com',
      petName: 'Milo',
      petSize: 'large',
      serviceName: 'Full Groom',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 43,
      startTime: '09:00',
      status: 'completed',
    },

    // ─── Week 8-9 (28-41 days ago) ─── peak
    {
      customerEmail: 'james@example.com',
      petName: 'Rocky',
      petSize: 'xlarge',
      serviceName: 'De-shedding Treatment',
      addonName: 'Flea & Tick Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 39,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Charlie',
      petSize: 'small',
      serviceName: 'Bath & Brush',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 38,
      startTime: '08:00',
      status: 'completed',
    },
    {
      customerEmail: 'sarah@example.com',
      petName: 'Buddy',
      petSize: 'large',
      serviceName: 'Bath & Brush',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 36,
      startTime: '10:00',
      status: 'completed',
    },
    {
      customerEmail: 'david@example.com',
      petName: 'Cooper',
      petSize: 'medium',
      serviceName: 'Full Groom',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 35,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'mike@example.com',
      petName: 'Max',
      petSize: 'large',
      serviceName: 'De-shedding Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 33,
      startTime: '13:00',
      status: 'completed',
    },
    {
      customerEmail: 'emily@example.com',
      petName: 'Bella',
      petSize: 'small',
      serviceName: 'Full Groom',
      addonName: 'Teeth Brushing',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 31,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'lisa@example.com',
      petName: 'Milo',
      petSize: 'large',
      serviceName: 'Nail Trim',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 30,
      startTime: '11:00',
      status: 'completed',
    },
    {
      customerEmail: 'david@example.com',
      petName: 'Sadie',
      petSize: 'large',
      serviceName: 'Full Groom',
      addonName: 'Flea & Tick Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 29,
      startTime: '09:00',
      status: 'completed',
    },

    // ─── Week 10-11 (14-27 days ago) ─── still busy
    {
      customerEmail: 'sarah@example.com',
      petName: 'Daisy',
      petSize: 'small',
      serviceName: 'Full Groom',
      addonName: 'Cologne Spritz',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 25,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Luna',
      petSize: 'medium',
      serviceName: 'Full Groom',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 23,
      startTime: '10:00',
      status: 'completed',
    },
    {
      customerEmail: 'mike@example.com',
      petName: 'Max',
      petSize: 'large',
      serviceName: 'Bath & Brush',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 21,
      startTime: '08:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Rocky',
      petSize: 'xlarge',
      serviceName: 'Bath & Brush',
      addonName: 'Flea & Tick Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 18,
      startTime: '09:00',
      status: 'no_show',
    },
    {
      customerEmail: 'david@example.com',
      petName: 'Cooper',
      petSize: 'medium',
      serviceName: 'Nail Trim',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 16,
      startTime: '14:00',
      status: 'completed',
    },
    {
      customerEmail: 'lisa@example.com',
      petName: 'Milo',
      petSize: 'large',
      serviceName: 'Full Groom',
      addonName: 'Teeth Brushing',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 14,
      startTime: '09:00',
      status: 'completed',
    },

    // ─── Week 12-13 (0-13 days ago) ─── recent + upcoming
    {
      customerEmail: 'sarah@example.com',
      petName: 'Buddy',
      petSize: 'large',
      serviceName: 'Full Groom',
      addonName: 'Cologne Spritz',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 11,
      startTime: '10:00',
      status: 'completed',
    },
    {
      customerEmail: 'emily@example.com',
      petName: 'Bella',
      petSize: 'small',
      serviceName: 'Bath & Brush',
      addonName: 'Teeth Brushing',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 9,
      startTime: '09:00',
      status: 'completed',
    },
    {
      customerEmail: 'james@example.com',
      petName: 'Charlie',
      petSize: 'small',
      serviceName: 'Nail Trim',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 7,
      startTime: '08:00',
      status: 'completed',
    },
    {
      customerEmail: 'david@example.com',
      petName: 'Sadie',
      petSize: 'large',
      serviceName: 'De-shedding Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 5,
      startTime: '13:00',
      status: 'completed',
    },
    {
      customerEmail: 'mike@example.com',
      petName: 'Max',
      petSize: 'large',
      serviceName: 'Full Groom',
      groomerEmail: 'jessica@barkside.com',
      daysAgo: 3,
      startTime: '09:00',
      status: 'confirmed',
    },
    {
      customerEmail: 'sarah@example.com',
      petName: 'Daisy',
      petSize: 'small',
      serviceName: 'Bath & Brush',
      groomerEmail: 'amanda@barkside.com',
      daysAgo: 1,
      startTime: '10:00',
      status: 'pending',
    },
    {
      customerEmail: 'lisa@example.com',
      petName: 'Milo',
      petSize: 'large',
      serviceName: 'Bath & Brush',
      addonName: 'Flea & Tick Treatment',
      groomerEmail: 'ryan@barkside.com',
      daysAgo: 0,
      startTime: '09:00',
      status: 'pending',
    },
  ];

  let completedCount = 0;
  let totalRevenueCents = 0;

  for (const spec of apptSpecs) {
    const customerId = customerIds[spec.customerEmail];
    const petId = petIds[spec.petName];
    const groomerId = employeeIds[spec.groomerEmail];
    const pricing = getPrice(spec.serviceName, spec.petSize);
    const scheduledDate = dateAgo(spec.daysAgo);
    const endTime = addMinutes(spec.startTime, pricing.durationMinutes);

    // Create appointment
    const [appt] = await db
      .insert(appointments)
      .values({
        customerId,
        status: spec.status,
        createdAt: daysAgo(spec.daysAgo + 3), // booked ~3 days before
        updatedAt: daysAgo(spec.daysAgo),
      })
      .returning();

    // Create appointment pet
    const [apptPet] = await db
      .insert(appointmentPets)
      .values({
        appointmentId: appt.id,
        petId,
        assignedGroomerId: groomerId,
        scheduledDate,
        startTime: spec.startTime,
        endTime,
        estimatedDurationMinutes: pricing.durationMinutes,
        status: spec.status,
      })
      .returning();

    // Create appointment service (base service)
    await db.insert(appointmentServices).values({
      appointmentPetId: apptPet.id,
      serviceId: svcMap[spec.serviceName],
      priceAtBookingCents: pricing.priceCents,
      durationAtBookingMinutes: pricing.durationMinutes,
    });

    // Create addon if specified
    let addonPriceCents = 0;
    if (spec.addonName) {
      const addonPricing = getPrice(spec.addonName, spec.petSize);
      addonPriceCents = addonPricing.priceCents;
      await db.insert(appointmentAddons).values({
        appointmentPetId: apptPet.id,
        serviceId: svcMap[spec.addonName],
        priceAtBookingCents: addonPriceCents,
      });
    }

    // For completed appointments: create invoice + payment
    if (spec.status === 'completed') {
      completedCount++;
      const subtotalCents = pricing.priceCents + addonPriceCents;
      const taxCents = Math.round(subtotalCents * 0.08); // 8% tax
      const tipCents = Math.round(subtotalCents * (Math.random() * 0.2)); // 0-20% tip
      const totalCents = subtotalCents + taxCents + tipCents;
      totalRevenueCents += totalCents;

      const [invoice] = await db
        .insert(invoices)
        .values({
          appointmentId: appt.id,
          subtotalCents,
          discountCents: 0,
          taxCents,
          tipCents,
          totalCents,
          status: 'paid',
          paidAt: daysAgo(spec.daysAgo),
          createdAt: daysAgo(spec.daysAgo),
        })
        .returning();

      // Line items
      await db.insert(invoiceLineItems).values({
        invoiceId: invoice.id,
        description: spec.serviceName,
        amountCents: pricing.priceCents,
        type: 'service',
      });

      if (spec.addonName) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoice.id,
          description: spec.addonName,
          amountCents: addonPriceCents,
          type: 'addon',
        });
      }

      if (taxCents > 0) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoice.id,
          description: 'Tax',
          amountCents: taxCents,
          type: 'tax',
        });
      }

      if (tipCents > 0) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoice.id,
          description: 'Tip',
          amountCents: tipCents,
          type: 'tip',
        });
      }

      // Payment
      await db.insert(payments).values({
        appointmentId: appt.id,
        amountCents: totalCents,
        status: 'captured',
        provider: 'stripe',
        transactionId: `pi_test_${appt.id.slice(0, 8)}`,
        tipCents,
        createdAt: daysAgo(spec.daysAgo),
      });
    }
  }

  console.log(`✓ Appointments seeded (${apptSpecs.length} total, ${completedCount} completed)`);
  console.log(`  Total test revenue: $${(totalRevenueCents / 100).toFixed(2)}`);

  // ─── Summary ───────────────────────────────────────────
  console.log('\n✅ Test data seed complete!');
  console.log('  Employees: 3 (2 groomers, 1 bather)');
  console.log('  Customers: 6');
  console.log('  Pets: 10');
  console.log(`  Appointments: ${apptSpecs.length}`);
  console.log('  Statuses: completed, cancelled, no_show, confirmed, pending');
  console.log('  Date range: last 90 days');
  console.log('\n  All test user passwords: password123');

  process.exit(0);
}

seedTestData().catch((err) => {
  console.error('❌ Test data seed failed:', err);
  process.exit(1);
});
