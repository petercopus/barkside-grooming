/**
 * NOTE: AI HEAVILY ASSISTED ME IN WRITING THIS SEED DATA
 *
 * Seeds the catalog (roles, permissions, sizes, services, pricing, addons,
 * bundles) plus a single admin user. Run before seed-test.ts.
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
  const roleData = [
    { name: 'Customer', description: 'Default customer role', isSystem: true },
    { name: 'Employee', description: 'Default employee role', isSystem: true },
    { name: 'Admin', description: 'Full system access', isSystem: true },
    { name: 'Groomer', description: '', isSystem: false },
    { name: 'Bather', description: '', isSystem: false },
    { name: 'Front Desk', description: '', isSystem: false },
  ] as const;

  for (const role of roleData) {
    await db.insert(roles).values(role).onConflictDoNothing({ target: roles.name });
  }

  const allRoles = await db.select().from(roles);
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

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

  await db.update(roles).set({ hasAllPermissions: true }).where(eq(roles.name, 'Admin'));

  console.log('✓ Roles seeded');
  //#endregion

  //#region PERMISSIONS
  // booking:read:own and pet:manage:own are documentation-only — owner isolation
  // is enforced in the service layer, not via requirePermission.
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
  const allSizeCategories = await db.select().from(petSizeCategories);
  const sizeMap = Object.fromEntries(allSizeCategories.map((c) => [c.name, c.id]));

  const serviceData = [
    // ─── Baths (tiered) ──────────────────────────────────
    {
      name: 'Express Bath',
      description: 'Quick rinse, shampoo, and towel dry — in and out in under an hour',
      category: 'Bath',
      isAddon: false,
      isActive: true,
      sortOrder: 0,
    },
    {
      name: 'Bath & Brush',
      description: 'Full bath with shampoo, blow dry, and brush out',
      category: 'Bath',
      isAddon: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Spa Bath',
      description: 'Premium bath with deep conditioning, blueberry facial, and aromatherapy',
      category: 'Bath',
      isAddon: false,
      isActive: true,
      sortOrder: 2,
    },
    // ─── Grooms ──────────────────────────────────────────
    {
      name: 'Full Groom',
      description: 'Bath, haircut, nail trim, ear cleaning',
      category: 'Grooming',
      isAddon: false,
      isActive: true,
      sortOrder: 10,
    },
    {
      name: 'Doodle / Breed Cut Groom',
      description: 'Specialty groom for doodles, poodles, and breed-specific cuts',
      category: 'Grooming',
      isAddon: false,
      isActive: true,
      sortOrder: 11,
    },
    {
      name: "Puppy's First Groom",
      description: 'Gentle introduction grooming for puppies under 6 months',
      category: 'Grooming',
      isAddon: false,
      isActive: true,
      sortOrder: 12,
    },
    {
      name: 'Senior Groom',
      description: 'Extra-gentle, low-stress groom for senior pets',
      category: 'Grooming',
      isAddon: false,
      isActive: true,
      sortOrder: 13,
    },
    // ─── Specialty / Basic ───────────────────────────────
    {
      name: 'Nail Trim',
      description: 'Trim and file nails',
      category: 'Basic',
      isAddon: false,
      isActive: true,
      sortOrder: 20,
    },
    {
      name: 'Pawdicure',
      description: 'Nail trim, filing, and paw balm massage',
      category: 'Basic',
      isAddon: false,
      isActive: true,
      sortOrder: 21,
    },
    {
      name: 'De-shedding Treatment',
      description: 'Specialized treatment to reduce shedding',
      category: 'Specialty',
      isAddon: false,
      isActive: true,
      sortOrder: 22,
    },
    {
      name: 'De-matting',
      description: 'Mat removal — billed per 15-minute increment',
      category: 'Specialty',
      isAddon: false,
      isActive: true,
      sortOrder: 23,
    },
    {
      name: 'De-skunk Treatment',
      description: 'Multi-stage de-skunk wash with specialty deodorizer',
      category: 'Specialty',
      isAddon: false,
      isActive: true,
      sortOrder: 24,
    },
    // ─── Cat services ────────────────────────────────────
    {
      name: 'Cat Bath',
      description: 'Gentle bath for cats — soothing handling, low-stress environment',
      category: 'Cat',
      isAddon: false,
      isActive: true,
      sortOrder: 30,
    },
    {
      name: 'Cat Groom',
      description: 'Full cat groom including lion cut — limited availability',
      category: 'Cat',
      isAddon: false,
      isActive: false,
      sortOrder: 31,
    },
    // ─── Addons ──────────────────────────────────────────
    {
      name: 'Teeth Brushing',
      description: 'Gentle dental cleaning',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 100,
    },
    {
      name: 'Cologne Spritz',
      description: 'Finishing fragrance spray',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 101,
    },
    {
      name: 'Nail Painting',
      description: 'Pet-safe nail polish application',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 102,
    },
    {
      name: 'Flea & Tick Treatment',
      description: 'Topical flea and tick prevention',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 103,
    },
    {
      name: 'Blueberry Facial',
      description: 'Tearless blueberry-scented facial scrub',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 104,
    },
    {
      name: 'Sanitary Trim',
      description: 'Hygienic trim around sensitive areas',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 105,
    },
    {
      name: 'Ear Plucking',
      description: 'Hand-pluck ear hair — helps prevent infections in floppy-eared breeds',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 106,
    },
    {
      name: 'Conditioning Mask',
      description: 'Deep-conditioning hair mask for dry or coarse coats',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 107,
    },
    {
      name: 'Paw Balm',
      description: 'Moisturizing balm massage for cracked or dry paw pads',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 108,
    },
    {
      name: 'Bow / Bandana',
      description: 'Finishing bow or bandana',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 109,
    },
    {
      name: 'Medicated Shampoo Upgrade',
      description: 'Upgrade to medicated shampoo for skin conditions',
      category: 'Addon',
      isAddon: true,
      isActive: true,
      sortOrder: 110,
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
  // Pricing is size-tiered. Doodle/Breed Cut runs ~30-40% above Full Groom to
  // reflect the extra time curly coats take. De-matting is flat per-15-min
  // regardless of size.
  type Tier = { small: number; medium: number; large: number; xlarge: number };
  const sizes = ['small', 'medium', 'large', 'xlarge'] as const;

  function tieredPricing(
    serviceName: string,
    prices: Tier,
    durations: Tier,
  ): Array<{
    serviceId: number;
    sizeCategoryId: number;
    priceCents: number;
    durationMinutes: number;
  }> {
    return sizes.map((s) => ({
      serviceId: svcMap[serviceName]!,
      sizeCategoryId: sizeMap[s]!,
      priceCents: prices[s],
      durationMinutes: durations[s],
    }));
  }

  const pricingData = [
    ...tieredPricing(
      'Express Bath',
      { small: 2500, medium: 3000, large: 3500, xlarge: 4000 },
      { small: 30, medium: 35, large: 45, xlarge: 55 },
    ),
    ...tieredPricing(
      'Bath & Brush',
      { small: 4000, medium: 5000, large: 6000, xlarge: 7500 },
      { small: 45, medium: 60, large: 75, xlarge: 90 },
    ),
    ...tieredPricing(
      'Spa Bath',
      { small: 5500, medium: 6500, large: 7500, xlarge: 9000 },
      { small: 60, medium: 75, large: 90, xlarge: 105 },
    ),
    ...tieredPricing(
      'Full Groom',
      { small: 6000, medium: 7500, large: 9500, xlarge: 11500 },
      { small: 75, medium: 90, large: 105, xlarge: 135 },
    ),
    ...tieredPricing(
      'Doodle / Breed Cut Groom',
      { small: 8000, medium: 10500, large: 13500, xlarge: 16500 },
      { small: 105, medium: 135, large: 165, xlarge: 195 },
    ),
    ...tieredPricing(
      "Puppy's First Groom",
      { small: 4500, medium: 5500, large: 6500, xlarge: 8000 },
      { small: 45, medium: 60, large: 75, xlarge: 90 },
    ),
    ...tieredPricing(
      'Senior Groom',
      { small: 5500, medium: 7000, large: 8500, xlarge: 10500 },
      { small: 75, medium: 90, large: 105, xlarge: 135 },
    ),
    ...tieredPricing(
      'Nail Trim',
      { small: 1500, medium: 1800, large: 2200, xlarge: 2800 },
      { small: 15, medium: 15, large: 20, xlarge: 25 },
    ),
    ...tieredPricing(
      'Pawdicure',
      { small: 2500, medium: 2800, large: 3200, xlarge: 3800 },
      { small: 25, medium: 25, large: 30, xlarge: 35 },
    ),
    ...tieredPricing(
      'De-shedding Treatment',
      { small: 3500, medium: 4500, large: 5500, xlarge: 6800 },
      { small: 30, medium: 45, large: 60, xlarge: 75 },
    ),
    // De-matting: flat per 15-min block regardless of size
    ...tieredPricing(
      'De-matting',
      { small: 1500, medium: 1500, large: 1500, xlarge: 1500 },
      { small: 15, medium: 15, large: 15, xlarge: 15 },
    ),
    ...tieredPricing(
      'De-skunk Treatment',
      { small: 4000, medium: 5000, large: 6000, xlarge: 7500 },
      { small: 45, medium: 60, large: 75, xlarge: 90 },
    ),
    ...tieredPricing(
      'Cat Bath',
      { small: 5500, medium: 6500, large: 7500, xlarge: 8500 },
      { small: 45, medium: 60, large: 75, xlarge: 90 },
    ),
    ...tieredPricing(
      'Cat Groom',
      { small: 7500, medium: 8500, large: 9500, xlarge: 11000 },
      { small: 75, medium: 90, large: 105, xlarge: 120 },
    ),
    // ─── Addon pricing ──────────────────────────────────
    ...tieredPricing(
      'Teeth Brushing',
      { small: 1200, medium: 1200, large: 1500, xlarge: 1800 },
      { small: 10, medium: 10, large: 15, xlarge: 15 },
    ),
    ...tieredPricing(
      'Cologne Spritz',
      { small: 500, medium: 500, large: 500, xlarge: 500 },
      { small: 5, medium: 5, large: 5, xlarge: 5 },
    ),
    ...tieredPricing(
      'Nail Painting',
      { small: 1500, medium: 1500, large: 1800, xlarge: 1800 },
      { small: 15, medium: 15, large: 20, xlarge: 20 },
    ),
    ...tieredPricing(
      'Flea & Tick Treatment',
      { small: 2500, medium: 3000, large: 3500, xlarge: 4000 },
      { small: 10, medium: 10, large: 15, xlarge: 15 },
    ),
    ...tieredPricing(
      'Blueberry Facial',
      { small: 800, medium: 800, large: 800, xlarge: 800 },
      { small: 10, medium: 10, large: 10, xlarge: 10 },
    ),
    ...tieredPricing(
      'Sanitary Trim',
      { small: 1000, medium: 1000, large: 1500, xlarge: 1500 },
      { small: 10, medium: 10, large: 15, xlarge: 15 },
    ),
    ...tieredPricing(
      'Ear Plucking',
      { small: 1200, medium: 1200, large: 1500, xlarge: 1500 },
      { small: 15, medium: 15, large: 20, xlarge: 20 },
    ),
    ...tieredPricing(
      'Conditioning Mask',
      { small: 1500, medium: 1800, large: 2200, xlarge: 2500 },
      { small: 10, medium: 15, large: 15, xlarge: 20 },
    ),
    ...tieredPricing(
      'Paw Balm',
      { small: 700, medium: 700, large: 700, xlarge: 700 },
      { small: 5, medium: 5, large: 5, xlarge: 5 },
    ),
    ...tieredPricing(
      'Bow / Bandana',
      { small: 300, medium: 300, large: 300, xlarge: 300 },
      { small: 5, medium: 5, large: 5, xlarge: 5 },
    ),
    ...tieredPricing(
      'Medicated Shampoo Upgrade',
      { small: 800, medium: 1000, large: 1200, xlarge: 1500 },
      { small: 5, medium: 5, large: 5, xlarge: 5 },
    ),
  ];

  for (const p of pricingData) {
    await db.insert(servicePricing).values(p).onConflictDoNothing();
  }

  console.log('✓ Service pricing seeded');
  //#endregion

  //#region ADDON-SERVICE
  // Defines which addons are offered alongside which base services.
  const addonAvailability: Record<string, string[]> = {
    'Express Bath': ['Cologne Spritz', 'Sanitary Trim', 'Bow / Bandana', 'Paw Balm'],
    'Bath & Brush': [
      'Teeth Brushing',
      'Cologne Spritz',
      'Flea & Tick Treatment',
      'Blueberry Facial',
      'Sanitary Trim',
      'Ear Plucking',
      'Conditioning Mask',
      'Paw Balm',
      'Bow / Bandana',
      'Medicated Shampoo Upgrade',
    ],
    'Spa Bath': [
      'Teeth Brushing',
      'Cologne Spritz',
      'Flea & Tick Treatment',
      'Sanitary Trim',
      'Ear Plucking',
      'Paw Balm',
      'Bow / Bandana',
      'Medicated Shampoo Upgrade',
    ],
    'Full Groom': [
      'Teeth Brushing',
      'Cologne Spritz',
      'Nail Painting',
      'Flea & Tick Treatment',
      'Blueberry Facial',
      'Sanitary Trim',
      'Ear Plucking',
      'Conditioning Mask',
      'Paw Balm',
      'Bow / Bandana',
      'Medicated Shampoo Upgrade',
    ],
    'Doodle / Breed Cut Groom': [
      'Teeth Brushing',
      'Cologne Spritz',
      'Nail Painting',
      'Flea & Tick Treatment',
      'Blueberry Facial',
      'Sanitary Trim',
      'Ear Plucking',
      'Conditioning Mask',
      'Paw Balm',
      'Bow / Bandana',
      'Medicated Shampoo Upgrade',
    ],
    "Puppy's First Groom": ['Cologne Spritz', 'Blueberry Facial', 'Paw Balm', 'Bow / Bandana'],
    'Senior Groom': [
      'Cologne Spritz',
      'Blueberry Facial',
      'Sanitary Trim',
      'Ear Plucking',
      'Conditioning Mask',
      'Paw Balm',
      'Bow / Bandana',
    ],
    'Nail Trim': ['Nail Painting', 'Paw Balm'],
    'Pawdicure': ['Nail Painting'],
    'De-shedding Treatment': [
      'Cologne Spritz',
      'Flea & Tick Treatment',
      'Conditioning Mask',
      'Bow / Bandana',
    ],
    'De-skunk Treatment': ['Cologne Spritz', 'Conditioning Mask', 'Medicated Shampoo Upgrade'],
    'Cat Bath': ['Cologne Spritz', 'Conditioning Mask', 'Paw Balm', 'Bow / Bandana'],
    'Cat Groom': ['Cologne Spritz', 'Conditioning Mask', 'Paw Balm', 'Bow / Bandana'],
  };

  for (const [baseName, addons] of Object.entries(addonAvailability)) {
    const baseId = svcMap[baseName];
    if (!baseId) continue;
    for (const addonName of addons) {
      const addonId = svcMap[addonName];
      if (!addonId) continue;
      await db
        .insert(serviceAddons)
        .values({ baseServiceId: baseId, addonServiceId: addonId })
        .onConflictDoNothing();
    }
  }

  console.log('✓ Addon-service associations seeded');
  //#endregion

  //#region BUNDLES
  const bundleData = [
    {
      name: 'Spa Day',
      description: 'Premium spa bath with blueberry facial, paw balm, and cologne — the works!',
      discountType: 'percent' as const,
      discountValue: 15,
      isActive: true,
    },
    {
      name: 'Fresh & Clean',
      description: 'Bath & brush with nail trim and ear plucking at a discount',
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

  const bundleContents: Record<string, string[]> = {
    'Spa Day': ['Spa Bath', 'Blueberry Facial', 'Paw Balm', 'Cologne Spritz'],
    'Fresh & Clean': ['Bath & Brush', 'Nail Trim', 'Ear Plucking'],
  };

  for (const [bundleName, serviceNames] of Object.entries(bundleContents)) {
    const bundleId = bundleMap[bundleName];
    if (!bundleId) continue;
    for (const svcName of serviceNames) {
      const serviceId = svcMap[svcName];
      if (!serviceId) continue;
      await db.insert(bundleServices).values({ bundleId, serviceId }).onConflictDoNothing();
    }
  }

  console.log('✓ Bundles seeded');
  //#endregion

  //#region ADMIN USER
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
