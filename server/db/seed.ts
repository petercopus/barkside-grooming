/**
 * NOTE: AI HEAVILY ASSISTED ME IN WRITING THIS SEED DATA
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../utils/password';
import { db } from './index';
import {
  bundles,
  bundleServices,
  permissions,
  petSizeCategories,
  rolePermissions,
  roles,
  serviceAddons,
  servicePricing,
  services,
  userRoles,
  users,
} from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  //#region ROLES
  // ─── 1. Roles ──────────────────────────────────────────
  const roleData = [
    { name: 'Customer', description: 'Default customer role', isSystem: true },
    { name: 'Employee', description: 'Default employee role', isSystem: true },
    { name: 'Admin', description: 'Full system access', isSystem: true },
    { name: 'Groomer', description: '', isSystem: false },
    { name: 'Bather', description: '', isSystem: false },
    { name: 'Front Desk', description: '', isSystem: false },
  ] as const;

  // Upsert: insert or skip if already exists
  for (const role of roleData) {
    await db.insert(roles).values(role).onConflictDoNothing({ target: roles.name });
  }

  // Fetch inserted roles so we have their IDs
  const allRoles = await db.select().from(roles);
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

  // Set role hierarchy
  await db
    .update(roles)
    .set({ parentRoleId: roleMap['Customer'] })
    .where(eq(roles.name, 'Employee'));
  await db
    .update(roles)
    .set({ parentRoleId: roleMap['Employee'] })
    .where(eq(roles.name, 'Groomer'));
  await db.update(roles).set({ parentRoleId: roleMap['Employee'] }).where(eq(roles.name, 'Bather'));
  await db
    .update(roles)
    .set({ parentRoleId: roleMap['Employee'] })
    .where(eq(roles.name, 'Front Desk'));

  // Admin gets all permissions via wildcard
  await db.update(roles).set({ hasAllPermissions: true }).where(eq(roles.name, 'Admin'));

  console.log('✓ Roles seeded');
  //#endregion

  //#region PERMISSIONS
  // ─── 2. Permissions ────────────────────────────────────
  // booking:read:own and pet:manage:own are kept for documentation. They are
  // not enforced by requirePermission — owner-isolation is done in the service
  // layer via a user.id filter. Listing them here makes the Customer role's
  // intended scope explicit in the matrix below.
  const permissionData = [
    { key: 'admin:access', description: 'Access the admin dashboard' },
    { key: 'booking:create', description: 'Create new bookings' },
    { key: 'booking:read:own', description: 'View own bookings' },
    { key: 'booking:read:all', description: 'View all bookings' },
    { key: 'booking:cancel', description: 'Cancel bookings' },
    { key: 'pet:manage:own', description: 'Manage own pets' },
    { key: 'pet:read:all', description: 'View all pets' },
    { key: 'pet:manage:all', description: 'Manage all pets' },
    { key: 'document:request', description: 'Request documents from customers' },
    { key: 'document:approve', description: 'Approve uploaded documents' },
    { key: 'document:delete', description: 'Delete uploaded documents' },
    { key: 'document:read:all', description: 'View all documents' },
    { key: 'service:manage', description: 'Manage services and pricing' },
    { key: 'employee:read', description: 'View employee accounts' },
    { key: 'employee:manage', description: 'Manage employee accounts' },
    { key: 'reports:view', description: 'View business reports' },
    { key: 'size-category:manage', description: 'Manage pet size categories' },
    { key: 'role:manage', description: 'Manage roles and permissions' },
    { key: 'customer:read', description: 'View customer accounts' },
    { key: 'customer:manage', description: 'Manage customer accounts' },
  ];

  for (const perm of permissionData) {
    await db.insert(permissions).values(perm).onConflictDoNothing({ target: permissions.key });
  }

  const allPerms = await db.select().from(permissions);
  const permMap = Object.fromEntries(allPerms.map((p) => [p.key, p.id]));

  console.log('✓ Permissions seeded');
  //#endregion

  //#region ROLE PERMISSIONS
  // ─── 3. Role-Permission Matrix ─────────────────────────
  // Maps each role to the permission keys it should have.
  // Groomer / Bather / Front Desk are seeded empty here; final lists
  // are populated in Batch 5 of docs/inprogress-fixes.md.
  const matrix: Record<string, string[]> = {
    'Customer': ['booking:create', 'booking:read:own', 'booking:cancel', 'pet:manage:own'],
    'Employee': [
      'admin:access',
      'booking:read:all',
      'pet:read:all',
      'document:request',
      'document:approve',
      'document:delete',
      'document:read:all',
      'employee:read',
    ],
    'Groomer': [],
    'Bather': [],
    'Front Desk': [],
    'Admin': [],
  };

  for (const [roleName, permKeys] of Object.entries(matrix)) {
    const roleId = roleMap[roleName];
    if (!roleId) continue;

    for (const key of permKeys) {
      const permId = permMap[key];
      if (!permId) continue;

      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId: permId })
        .onConflictDoNothing();
    }
  }

  console.log('✓ Role-permission mappings seeded');
  //#endregion

  //#region PET SIZE
  // ─── 4. Pet Size Categories ────────────────────────────
  const sizeCategories = [
    { name: 'small', minWeight: 0, maxWeight: 15 },
    { name: 'medium', minWeight: 16, maxWeight: 40 },
    { name: 'large', minWeight: 41, maxWeight: 80 },
    { name: 'xlarge', minWeight: 81, maxWeight: 999 },
  ];

  for (const cat of sizeCategories) {
    await db
      .insert(petSizeCategories)
      .values(cat)
      .onConflictDoNothing({ target: petSizeCategories.name });
  }

  console.log('✓ Pet size categories seeded');
  //#endregion

  //#region SERVICES
  // ─── 5. Services ───────────────────────────────────────
  const allSizeCategories = await db.select().from(petSizeCategories);
  const sizeMap = Object.fromEntries(allSizeCategories.map((c) => [c.name, c.id]));

  const serviceData = [
    {
      name: 'Bath & Brush',
      description: 'Full bath with shampoo, blow dry, and brush out',
      category: 'Grooming',
      isAddon: false,
      sortOrder: 0,
    },
    {
      name: 'Full Groom',
      description: 'Bath, haircut, nail trim, ear cleaning',
      category: 'Grooming',
      isAddon: false,
      sortOrder: 1,
    },
    {
      name: 'Nail Trim',
      description: 'Trim and file nails',
      category: 'Basic',
      isAddon: false,
      sortOrder: 2,
    },
    {
      name: 'De-shedding Treatment',
      description: 'Specialized treatment to reduce shedding',
      category: 'Specialty',
      isAddon: false,
      sortOrder: 3,
    },
    {
      name: 'Teeth Brushing',
      description: 'Gentle dental cleaning',
      category: 'Addon',
      isAddon: true,
      sortOrder: 10,
    },
    {
      name: 'Cologne Spritz',
      description: 'Finishing fragrance spray',
      category: 'Addon',
      isAddon: true,
      sortOrder: 11,
    },
    {
      name: 'Nail Painting',
      description: 'Pet-safe nail polish application',
      category: 'Addon',
      isAddon: true,
      sortOrder: 12,
    },
    {
      name: 'Flea & Tick Treatment',
      description: 'Topical flea and tick prevention',
      category: 'Addon',
      isAddon: true,
      sortOrder: 13,
    },
  ];

  for (const svc of serviceData) {
    await db.insert(services).values(svc).onConflictDoNothing({ target: services.name });
  }

  const allServices = await db.select().from(services);
  const svcMap = Object.fromEntries(allServices.map((s) => [s.name, s.id]));

  console.log('✓ Services seeded');
  //#endregion

  //#region SERVICE PRICING
  // ─── 6. Service Pricing ────────────────────────────────
  const pricingData = [
    // Bath & Brush
    {
      serviceId: svcMap['Bath & Brush'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 3500,
      durationMinutes: 45,
    },
    {
      serviceId: svcMap['Bath & Brush'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 4500,
      durationMinutes: 60,
    },
    {
      serviceId: svcMap['Bath & Brush'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 5500,
      durationMinutes: 75,
    },
    {
      serviceId: svcMap['Bath & Brush'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 6500,
      durationMinutes: 90,
    },
    // Full Groom
    {
      serviceId: svcMap['Full Groom'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 5500,
      durationMinutes: 60,
    },
    {
      serviceId: svcMap['Full Groom'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 7000,
      durationMinutes: 75,
    },
    {
      serviceId: svcMap['Full Groom'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 8500,
      durationMinutes: 90,
    },
    {
      serviceId: svcMap['Full Groom'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 10000,
      durationMinutes: 120,
    },
    // Nail Trim
    {
      serviceId: svcMap['Nail Trim'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 1500,
      durationMinutes: 15,
    },
    {
      serviceId: svcMap['Nail Trim'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 1500,
      durationMinutes: 15,
    },
    {
      serviceId: svcMap['Nail Trim'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 2000,
      durationMinutes: 20,
    },
    {
      serviceId: svcMap['Nail Trim'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 2500,
      durationMinutes: 25,
    },
    // De-shedding
    {
      serviceId: svcMap['De-shedding Treatment'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 3000,
      durationMinutes: 30,
    },
    {
      serviceId: svcMap['De-shedding Treatment'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 4000,
      durationMinutes: 45,
    },
    {
      serviceId: svcMap['De-shedding Treatment'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 5000,
      durationMinutes: 60,
    },
    {
      serviceId: svcMap['De-shedding Treatment'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 6000,
      durationMinutes: 75,
    },
    // Teeth Brushing (addon — flat-ish pricing)
    {
      serviceId: svcMap['Teeth Brushing'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 1000,
      durationMinutes: 10,
    },
    {
      serviceId: svcMap['Teeth Brushing'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 1000,
      durationMinutes: 10,
    },
    {
      serviceId: svcMap['Teeth Brushing'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 1200,
      durationMinutes: 15,
    },
    {
      serviceId: svcMap['Teeth Brushing'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 1500,
      durationMinutes: 15,
    },
    // Cologne Spritz (addon — flat pricing)
    {
      serviceId: svcMap['Cologne Spritz'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 500,
      durationMinutes: 5,
    },
    {
      serviceId: svcMap['Cologne Spritz'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 500,
      durationMinutes: 5,
    },
    {
      serviceId: svcMap['Cologne Spritz'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 500,
      durationMinutes: 5,
    },
    {
      serviceId: svcMap['Cologne Spritz'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 500,
      durationMinutes: 5,
    },
    // Nail Painting (addon)
    {
      serviceId: svcMap['Nail Painting'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 1200,
      durationMinutes: 15,
    },
    {
      serviceId: svcMap['Nail Painting'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 1200,
      durationMinutes: 15,
    },
    {
      serviceId: svcMap['Nail Painting'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 1500,
      durationMinutes: 20,
    },
    {
      serviceId: svcMap['Nail Painting'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 1500,
      durationMinutes: 20,
    },
    // Flea & Tick Treatment (addon)
    {
      serviceId: svcMap['Flea & Tick Treatment'],
      sizeCategoryId: sizeMap['small'],
      priceCents: 2000,
      durationMinutes: 10,
    },
    {
      serviceId: svcMap['Flea & Tick Treatment'],
      sizeCategoryId: sizeMap['medium'],
      priceCents: 2500,
      durationMinutes: 10,
    },
    {
      serviceId: svcMap['Flea & Tick Treatment'],
      sizeCategoryId: sizeMap['large'],
      priceCents: 3000,
      durationMinutes: 15,
    },
    {
      serviceId: svcMap['Flea & Tick Treatment'],
      sizeCategoryId: sizeMap['xlarge'],
      priceCents: 3500,
      durationMinutes: 15,
    },
  ];

  for (const p of pricingData) {
    await db
      .insert(servicePricing)
      .values(p as any)
      .onConflictDoNothing();
  }

  console.log('✓ Service pricing seeded');
  //#endregion

  //#region ADDON-SERVICE
  // ─── 7. Addon-Service Associations ─────────────────────
  const addonLinks = [
    // Teeth Brushing available with Bath & Brush, Full Groom
    { baseServiceId: svcMap['Bath & Brush'], addonServiceId: svcMap['Teeth Brushing'] },
    { baseServiceId: svcMap['Full Groom'], addonServiceId: svcMap['Teeth Brushing'] },
    // Cologne available with Bath & Brush, Full Groom
    { baseServiceId: svcMap['Bath & Brush'], addonServiceId: svcMap['Cologne Spritz'] },
    { baseServiceId: svcMap['Full Groom'], addonServiceId: svcMap['Cologne Spritz'] },
    // Nail Painting available with Full Groom, Nail Trim
    { baseServiceId: svcMap['Full Groom'], addonServiceId: svcMap['Nail Painting'] },
    { baseServiceId: svcMap['Nail Trim'], addonServiceId: svcMap['Nail Painting'] },
    // Flea & Tick available with Bath & Brush, Full Groom, De-shedding
    { baseServiceId: svcMap['Bath & Brush'], addonServiceId: svcMap['Flea & Tick Treatment'] },
    { baseServiceId: svcMap['Full Groom'], addonServiceId: svcMap['Flea & Tick Treatment'] },
    {
      baseServiceId: svcMap['De-shedding Treatment'],
      addonServiceId: svcMap['Flea & Tick Treatment'],
    },
  ];

  for (const link of addonLinks) {
    await db
      .insert(serviceAddons)
      .values(link as any)
      .onConflictDoNothing();
  }

  console.log('✓ Addon-service associations seeded');
  //#endregion

  //#region BUNDLES
  // ─── 8. Bundles ────────────────────────────────────────
  const bundleData = [
    {
      name: 'Spa Day',
      description: 'Full groom with teeth brushing and cologne — the works!',
      discountType: 'percent' as const,
      discountValue: 15,
      isActive: true,
    },
    {
      name: 'Fresh & Clean',
      description: 'Bath & brush plus flea treatment at a discount',
      discountType: 'fixed' as const,
      discountValue: 500,
      isActive: true,
    },
  ];

  for (const b of bundleData) {
    await db.insert(bundles).values(b).onConflictDoNothing({ target: bundles.name });
  }

  const allBundles = await db.select().from(bundles);
  const bundleMap = Object.fromEntries(allBundles.map((b) => [b.name, b.id]));

  // Spa Day = Full Groom + Teeth Brushing + Cologne Spritz
  const spaDayServices = [svcMap['Full Groom'], svcMap['Teeth Brushing'], svcMap['Cologne Spritz']];
  for (const serviceId of spaDayServices) {
    await db
      .insert(bundleServices)
      .values({ bundleId: bundleMap['Spa Day'], serviceId } as any)
      .onConflictDoNothing();
  }

  // Fresh & Clean = Bath & Brush + Flea & Tick Treatment
  const freshCleanServices = [svcMap['Bath & Brush'], svcMap['Flea & Tick Treatment']];
  for (const serviceId of freshCleanServices) {
    await db
      .insert(bundleServices)
      .values({ bundleId: bundleMap['Fresh & Clean'], serviceId } as any)
      .onConflictDoNothing();
  }

  console.log('✓ Bundles seeded');
  //#endregion

  //#region TEST USERS
  // ─── 9. Test Admin User ────────────────────────────────
  const adminEmail = 'admin@barkside.com';
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length === 0) {
    const passwordHash = await hashPassword('password123');

    const [adminUser] = await db
      .insert(users)
      .values({
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Owner',
        phone: '555-000-0000',
      })
      .returning();

    // Assign admin role
    if (adminUser && roleMap['Admin']) {
      await db.insert(userRoles).values({
        userId: adminUser.id,
        roleId: roleMap['Admin'],
      });
    }

    console.log(`✓ Admin user created (${adminEmail} / password123)`);
  } else {
    console.log(`✓ Admin user already exists (${adminEmail})`);
  }
  //#endregion

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
