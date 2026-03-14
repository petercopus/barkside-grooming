/**
 * NOTE: AI HEAVILY ASSISTED ME IN WRITING THIS SEED DATA
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../utils/password';
import { db } from './index';
import { permissions, petSizeCategories, rolePermissions, roles, userRoles, users } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  // ─── 1. Roles ──────────────────────────────────────────
  const roleData = [
    { name: 'customer', description: 'Default customer role', isSystem: true },
    { name: 'employee', description: 'Groomer / staff member', isSystem: true },
    { name: 'front_desk', description: 'Front desk staff', isSystem: true },
    { name: 'admin', description: 'Business owner / administrator', isSystem: true },
  ] as const;

  // Upsert: insert or skip if already exists
  for (const role of roleData) {
    await db.insert(roles).values(role).onConflictDoNothing({ target: roles.name });
  }

  // Fetch inserted roles so we have their IDs
  const allRoles = await db.select().from(roles);
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

  console.log('✓ Roles seeded');

  // ─── 2. Permissions ────────────────────────────────────
  const permissionData = [
    { key: 'booking:create', description: 'Create new bookings' },
    { key: 'booking:read:own', description: 'View own bookings' },
    { key: 'booking:read:all', description: 'View all bookings' },
    { key: 'booking:update:own', description: 'Update own bookings' },
    { key: 'booking:update:all', description: 'Update any booking' },
    { key: 'booking:cancel', description: 'Cancel bookings' },
    { key: 'pet:manage:own', description: 'Manage own pets' },
    { key: 'pet:read:all', description: 'View all pets' },
    { key: 'document:upload:own', description: 'Upload own documents' },
    { key: 'document:request', description: 'Request documents from customers' },
    { key: 'document:read:all', description: 'View all documents' },
    { key: 'schedule:read:own', description: 'View own schedule' },
    { key: 'schedule:read:all', description: 'View all schedules' },
    { key: 'schedule:manage', description: 'Manage employee schedules' },
    { key: 'service:read', description: 'View services catalog' },
    { key: 'service:manage', description: 'Manage services and pricing' },
    { key: 'employee:manage', description: 'Manage employee accounts' },
    { key: 'reports:view', description: 'View business reports' },
    { key: 'settings:manage', description: 'Manage business settings' },
    { key: 'promo:manage', description: 'Manage promotions and bundles' },
    { key: 'review:create', description: 'Create reviews' },
    { key: 'review:moderate', description: 'Moderate reviews' },
  ];

  for (const perm of permissionData) {
    await db.insert(permissions).values(perm).onConflictDoNothing({ target: permissions.key });
  }

  const allPerms = await db.select().from(permissions);
  const permMap = Object.fromEntries(allPerms.map((p) => [p.key, p.id]));

  console.log('✓ Permissions seeded');

  // ─── 3. Role-Permission Matrix ─────────────────────────
  // Maps each role to the permission keys it should have.
  // Matches the table from the project plan exactly.
  const matrix: Record<string, string[]> = {
    customer: [
      'booking:create',
      'booking:read:own',
      'booking:update:own',
      'booking:cancel',
      'pet:manage:own',
      'document:upload:own',
      'service:read',
      'review:create',
    ],
    employee: [
      'booking:read:own',
      'pet:read:all',
      'document:read:all',
      'schedule:read:own',
      'service:read',
    ],
    front_desk: [
      'booking:create',
      'booking:read:all',
      'booking:update:all',
      'booking:cancel',
      'pet:read:all',
      'document:request',
      'document:read:all',
      'schedule:read:all',
      'service:read',
    ],
    admin: [
      'booking:create',
      'booking:read:all',
      'booking:update:all',
      'booking:cancel',
      'pet:read:all',
      'document:request',
      'document:read:all',
      'schedule:read:all',
      'schedule:manage',
      'service:read',
      'service:manage',
      'employee:manage',
      'reports:view',
      'settings:manage',
      'promo:manage',
      'review:moderate',
    ],
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

  // ─── 5. Test Admin User ────────────────────────────────
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
    if (adminUser && roleMap['admin']) {
      await db.insert(userRoles).values({
        userId: adminUser.id,
        roleId: roleMap['admin'],
      });
    }

    console.log(`✓ Admin user created (${adminEmail} / password123)`);
  } else {
    console.log(`✓ Admin user already exists (${adminEmail})`);
  }

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
