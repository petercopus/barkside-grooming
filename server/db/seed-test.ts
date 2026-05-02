/**
 * AI ASSISTED WITH CREATING THIS SEED DATA
 *
 * Test data seed for reporting development.
 * Run AFTER the base seed (db:seed) — depends on roles, permissions, services, etc.
 *
 * Creates: 6 employees, ~25 customers, ~38 pets (incl. inactive), and
 * ~280 appointments programmatically generated over the last 9 months.
 * Completed appointments get invoices, line items, and payments. ~15% of
 * appointments use a bundle so the appointment_bundles table is exercised.
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../utils/password';
import { db } from './index';
import {
  appointmentAddons,
  appointmentBundles,
  appointmentPets,
  appointmentServices,
  appointments,
  bundleServices,
  bundles as bundlesTable,
  employeeSchedules,
  employeeServices,
  invoiceLineItems,
  invoices,
  payments,
  petSizeCategories,
  pets,
  roles,
  servicePricing,
  services,
  userRoles,
  users,
} from './schema';

// ─── Config ──────────────────────────────────────────────
const HISTORY_DAYS = 270; // 9 months of history
const FUTURE_DAYS = 14; // upcoming appointments window
const RNG_SEED = 0xb4a4_5d31; // deterministic so re-seeds produce the same data

// ─── Helpers ─────────────────────────────────────────────

/** Linear-congruential PRNG so seeds are reproducible. */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Returns a Date that is `daysOffset` days from today, at noon UTC. Negative = future. */
function dayOffset(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function dateOffset(n: number): string {
  return dayOffset(n).toISOString().split('T')[0]!;
}

function addMinutes(time: string, mins: number): string {
  const [h = 0, m = 0] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function dayOfWeek(daysAgo: number): number {
  return dayOffset(daysAgo).getUTCDay(); // 0 = Sun ... 6 = Sat
}

/** Returns the calendar month (1-12) for an appointment that many days ago. */
function monthOf(daysAgo: number): number {
  return dayOffset(daysAgo).getUTCMonth() + 1;
}

function pickWeighted<T>(rng: () => number, items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1]![0];
}

function pickOne<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

// ─── Customer profiles ───────────────────────────────────

type Profile = 'monthly' | 'six_week' | 'occasional' | 'lapsed' | 'one_time' | 'inactive';

interface ProfileSpec {
  cadenceDays: number;
  jitterDays: number;
  startDaysAgo: number;
  /** Lower bound of generation window — appointments stop being generated below this. */
  minDaysAgo: number;
}

const profileSpecs: Record<Profile, ProfileSpec> = {
  monthly: { cadenceDays: 30, jitterDays: 5, startDaysAgo: 255, minDaysAgo: 5 },
  six_week: { cadenceDays: 42, jitterDays: 7, startDaysAgo: 250, minDaysAgo: 10 },
  occasional: { cadenceDays: 85, jitterDays: 14, startDaysAgo: 240, minDaysAgo: 20 },
  // Lapsed customers stopped coming ~100 days ago
  lapsed: { cadenceDays: 35, jitterDays: 7, startDaysAgo: 240, minDaysAgo: 100 },
  one_time: { cadenceDays: 0, jitterDays: 0, startDaysAgo: 0, minDaysAgo: 0 },
  inactive: { cadenceDays: 0, jitterDays: 0, startDaysAgo: 0, minDaysAgo: 0 },
};

// ─── Employees ───────────────────────────────────────────

interface EmployeeData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'Groomer' | 'Bather' | 'Front Desk';
  schedule: { days: number[]; start: string; end: string };
}

const employeeData: EmployeeData[] = [
  {
    email: 'jessica@barkside.com',
    firstName: 'Jessica',
    lastName: 'Taylor',
    phone: '555-100-0001',
    role: 'Groomer',
    schedule: { days: [1, 2, 3, 4, 5], start: '08:00', end: '16:00' },
  },
  {
    email: 'ryan@barkside.com',
    firstName: 'Ryan',
    lastName: 'Garcia',
    phone: '555-100-0002',
    role: 'Groomer',
    schedule: { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '17:00' },
  },
  {
    email: 'maria@barkside.com',
    firstName: 'Maria',
    lastName: 'Lopez',
    phone: '555-100-0003',
    role: 'Groomer',
    schedule: { days: [2, 4, 6], start: '10:00', end: '15:00' },
  },
  {
    email: 'amanda@barkside.com',
    firstName: 'Amanda',
    lastName: 'White',
    phone: '555-100-0004',
    role: 'Bather',
    schedule: { days: [2, 3, 4, 5, 6], start: '08:00', end: '15:00' },
  },
  {
    email: 'tyler@barkside.com',
    firstName: 'Tyler',
    lastName: 'Brooks',
    phone: '555-100-0005',
    role: 'Bather',
    schedule: { days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' },
  },
  {
    email: 'sophia@barkside.com',
    firstName: 'Sophia',
    lastName: 'Patel',
    phone: '555-100-0006',
    role: 'Front Desk',
    schedule: { days: [1, 2, 3, 4, 5, 6], start: '08:00', end: '16:00' },
  },
];

const groomerOnlyServices = new Set([
  'Full Groom',
  'Doodle / Breed Cut Groom',
  "Puppy's First Groom",
  'Senior Groom',
  'De-skunk Treatment',
  'Cat Groom',
]);

// Cat services need a specialist — only Jessica & Maria
const catSpecialists = new Set(['jessica@barkside.com', 'maria@barkside.com']);

// ─── Customers ───────────────────────────────────────────

interface CustomerData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  profile: Profile;
}

const customerData: CustomerData[] = [
  {
    email: 'sarah@example.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '555-200-0001',
    profile: 'monthly',
  },
  {
    email: 'mike@example.com',
    firstName: 'Mike',
    lastName: 'Chen',
    phone: '555-200-0002',
    profile: 'monthly',
  },
  {
    email: 'emily@example.com',
    firstName: 'Emily',
    lastName: 'Davis',
    phone: '555-200-0003',
    profile: 'six_week',
  },
  {
    email: 'james@example.com',
    firstName: 'James',
    lastName: 'Wilson',
    phone: '555-200-0004',
    profile: 'six_week',
  },
  {
    email: 'lisa@example.com',
    firstName: 'Lisa',
    lastName: 'Martinez',
    phone: '555-200-0005',
    profile: 'monthly',
  },
  {
    email: 'david@example.com',
    firstName: 'David',
    lastName: 'Brown',
    phone: '555-200-0006',
    profile: 'six_week',
  },
  {
    email: 'karen@example.com',
    firstName: 'Karen',
    lastName: 'Thompson',
    phone: '555-200-0007',
    profile: 'lapsed',
  },
  {
    email: 'robert@example.com',
    firstName: 'Robert',
    lastName: 'Anderson',
    phone: '555-200-0008',
    profile: 'lapsed',
  },
  {
    email: 'jennifer@example.com',
    firstName: 'Jennifer',
    lastName: 'Lee',
    phone: '555-200-0009',
    profile: 'monthly',
  },
  {
    email: 'michael@example.com',
    firstName: 'Michael',
    lastName: 'Rodriguez',
    phone: '555-200-0010',
    profile: 'six_week',
  },
  {
    email: 'jessw@example.com',
    firstName: 'Jessica',
    lastName: 'Williams',
    phone: '555-200-0011',
    profile: 'occasional',
  },
  {
    email: 'chris@example.com',
    firstName: 'Christopher',
    lastName: 'Moore',
    phone: '555-200-0012',
    profile: 'one_time',
  },
  {
    email: 'amandah@example.com',
    firstName: 'Amanda',
    lastName: 'Hall',
    phone: '555-200-0013',
    profile: 'monthly',
  },
  {
    email: 'daniel@example.com',
    firstName: 'Daniel',
    lastName: 'Wright',
    phone: '555-200-0014',
    profile: 'inactive',
  },
  {
    email: 'stephanie@example.com',
    firstName: 'Stephanie',
    lastName: 'Lewis',
    phone: '555-200-0015',
    profile: 'monthly',
  },
  {
    email: 'brandon@example.com',
    firstName: 'Brandon',
    lastName: 'Walker',
    phone: '555-200-0016',
    profile: 'six_week',
  },
  {
    email: 'nicole@example.com',
    firstName: 'Nicole',
    lastName: 'Young',
    phone: '555-200-0017',
    profile: 'monthly',
  },
  {
    email: 'kevin@example.com',
    firstName: 'Kevin',
    lastName: 'King',
    phone: '555-200-0018',
    profile: 'lapsed',
  },
  {
    email: 'rachel@example.com',
    firstName: 'Rachel',
    lastName: 'Scott',
    phone: '555-200-0019',
    profile: 'six_week',
  },
  {
    email: 'justin@example.com',
    firstName: 'Justin',
    lastName: 'Green',
    phone: '555-200-0020',
    profile: 'occasional',
  },
  {
    email: 'megan@example.com',
    firstName: 'Megan',
    lastName: 'Adams',
    phone: '555-200-0021',
    profile: 'monthly',
  },
  {
    email: 'anthony@example.com',
    firstName: 'Anthony',
    lastName: 'Baker',
    phone: '555-200-0022',
    profile: 'one_time',
  },
  {
    email: 'heather@example.com',
    firstName: 'Heather',
    lastName: 'Nelson',
    phone: '555-200-0023',
    profile: 'monthly',
  },
  {
    email: 'brian@example.com',
    firstName: 'Brian',
    lastName: 'Hill',
    phone: '555-200-0024',
    profile: 'lapsed',
  },
  {
    email: 'olivia@example.com',
    firstName: 'Olivia',
    lastName: 'Carter',
    phone: '555-200-0025',
    profile: 'six_week',
  },
];

// ─── Pets ────────────────────────────────────────────────

interface PetData {
  ownerEmail: string;
  name: string;
  breed: string;
  weightLbs: number;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  gender: 'male' | 'female';
  coatType: 'short' | 'medium' | 'long' | 'curly' | 'double';
  species?: 'dog' | 'cat'; // defaults to 'dog'
  isActive?: boolean; // defaults to true
  isSenior?: boolean;
  isPuppy?: boolean;
  specialNotes?: string;
}

const petData: PetData[] = [
  // Sarah — 2 active + 1 inactive (deceased)
  {
    ownerEmail: 'sarah@example.com',
    name: 'Buddy',
    breed: 'Golden Retriever',
    weightLbs: 70,
    size: 'large',
    gender: 'male',
    coatType: 'long',
  },
  {
    ownerEmail: 'sarah@example.com',
    name: 'Daisy',
    breed: 'Pomeranian',
    weightLbs: 8,
    size: 'small',
    gender: 'female',
    coatType: 'long',
  },
  {
    ownerEmail: 'sarah@example.com',
    name: 'Murphy',
    breed: 'Labrador Retriever',
    weightLbs: 80,
    size: 'large',
    gender: 'male',
    coatType: 'short',
    isActive: false,
    specialNotes: 'Passed away peacefully — kept in records',
  },
  // Mike
  {
    ownerEmail: 'mike@example.com',
    name: 'Max',
    breed: 'Labrador Retriever',
    weightLbs: 75,
    size: 'large',
    gender: 'male',
    coatType: 'short',
  },
  // Emily
  {
    ownerEmail: 'emily@example.com',
    name: 'Bella',
    breed: 'Shih Tzu',
    weightLbs: 12,
    size: 'small',
    gender: 'female',
    coatType: 'long',
  },
  // James — 3 pets
  {
    ownerEmail: 'james@example.com',
    name: 'Rocky',
    breed: 'German Shepherd',
    weightLbs: 85,
    size: 'xlarge',
    gender: 'male',
    coatType: 'medium',
  },
  {
    ownerEmail: 'james@example.com',
    name: 'Luna',
    breed: 'French Bulldog',
    weightLbs: 25,
    size: 'medium',
    gender: 'female',
    coatType: 'short',
  },
  {
    ownerEmail: 'james@example.com',
    name: 'Charlie',
    breed: 'Chihuahua',
    weightLbs: 5,
    size: 'small',
    gender: 'male',
    coatType: 'short',
    isSenior: true,
  },
  // Lisa — 1 active + 1 inactive (moved away)
  {
    ownerEmail: 'lisa@example.com',
    name: 'Milo',
    breed: 'Standard Poodle',
    weightLbs: 55,
    size: 'large',
    gender: 'male',
    coatType: 'curly',
  },
  {
    ownerEmail: 'lisa@example.com',
    name: 'Honey',
    breed: 'Cocker Spaniel',
    weightLbs: 25,
    size: 'medium',
    gender: 'female',
    coatType: 'long',
    isActive: false,
    specialNotes: 'Owner moved out of state',
  },
  // David — 2 pets
  {
    ownerEmail: 'david@example.com',
    name: 'Sadie',
    breed: 'Siberian Husky',
    weightLbs: 50,
    size: 'large',
    gender: 'female',
    coatType: 'double',
  },
  {
    ownerEmail: 'david@example.com',
    name: 'Cooper',
    breed: 'Beagle',
    weightLbs: 22,
    size: 'medium',
    gender: 'male',
    coatType: 'short',
  },
  // Karen — lapsed
  {
    ownerEmail: 'karen@example.com',
    name: 'Bailey',
    breed: 'Goldendoodle',
    weightLbs: 65,
    size: 'large',
    gender: 'female',
    coatType: 'curly',
  },
  // Robert — lapsed
  {
    ownerEmail: 'robert@example.com',
    name: 'Duke',
    breed: 'Bernese Mountain Dog',
    weightLbs: 105,
    size: 'xlarge',
    gender: 'male',
    coatType: 'long',
  },
  // Jennifer — 3 pets
  {
    ownerEmail: 'jennifer@example.com',
    name: 'Coco',
    breed: 'Bichon Frise',
    weightLbs: 14,
    size: 'small',
    gender: 'female',
    coatType: 'curly',
  },
  {
    ownerEmail: 'jennifer@example.com',
    name: 'Pepper',
    breed: 'Yorkshire Terrier',
    weightLbs: 6,
    size: 'small',
    gender: 'female',
    coatType: 'long',
  },
  {
    ownerEmail: 'jennifer@example.com',
    name: 'Lucky',
    breed: 'Cavapoo',
    weightLbs: 12,
    size: 'small',
    gender: 'male',
    coatType: 'curly',
  },
  // Michael
  {
    ownerEmail: 'michael@example.com',
    name: 'Zeus',
    breed: 'German Shepherd',
    weightLbs: 78,
    size: 'large',
    gender: 'male',
    coatType: 'medium',
  },
  // Jessica W
  {
    ownerEmail: 'jessw@example.com',
    name: 'Lola',
    breed: 'Cavalier King Charles Spaniel',
    weightLbs: 16,
    size: 'medium',
    gender: 'female',
    coatType: 'long',
  },
  // Christopher — one-time
  {
    ownerEmail: 'chris@example.com',
    name: 'Bruno',
    breed: 'Pug',
    weightLbs: 18,
    size: 'small',
    gender: 'male',
    coatType: 'short',
  },
  // Amanda H — 2 doodles
  {
    ownerEmail: 'amandah@example.com',
    name: 'Teddy',
    breed: 'Goldendoodle',
    weightLbs: 60,
    size: 'large',
    gender: 'male',
    coatType: 'curly',
  },
  {
    ownerEmail: 'amandah@example.com',
    name: 'Maggie',
    breed: 'Goldendoodle',
    weightLbs: 55,
    size: 'large',
    gender: 'female',
    coatType: 'curly',
  },
  // Daniel — no pets (inactive customer)
  // Stephanie — 2 pets
  {
    ownerEmail: 'stephanie@example.com',
    name: 'Roxy',
    breed: 'Border Collie',
    weightLbs: 45,
    size: 'large',
    gender: 'female',
    coatType: 'long',
  },
  {
    ownerEmail: 'stephanie@example.com',
    name: 'Marley',
    breed: 'Border Collie',
    weightLbs: 40,
    size: 'medium',
    gender: 'male',
    coatType: 'long',
  },
  // Brandon — 2 pets
  {
    ownerEmail: 'brandon@example.com',
    name: 'Bear',
    breed: 'Australian Shepherd',
    weightLbs: 50,
    size: 'large',
    gender: 'male',
    coatType: 'long',
  },
  {
    ownerEmail: 'brandon@example.com',
    name: 'Willow',
    breed: 'Australian Shepherd',
    weightLbs: 48,
    size: 'large',
    gender: 'female',
    coatType: 'long',
  },
  // Nicole — 1 dog + 1 cat
  {
    ownerEmail: 'nicole@example.com',
    name: 'Penny',
    breed: 'Cavapoo',
    weightLbs: 14,
    size: 'small',
    gender: 'female',
    coatType: 'curly',
  },
  {
    ownerEmail: 'nicole@example.com',
    name: 'Whiskers',
    breed: 'Maine Coon',
    weightLbs: 14,
    size: 'small',
    gender: 'female',
    coatType: 'long',
    species: 'cat',
  },
  // Kevin — lapsed
  {
    ownerEmail: 'kevin@example.com',
    name: 'Tucker',
    breed: 'Beagle',
    weightLbs: 25,
    size: 'medium',
    gender: 'male',
    coatType: 'short',
  },
  // Rachel — 2 pets, one is a puppy
  {
    ownerEmail: 'rachel@example.com',
    name: 'Ginger',
    breed: 'Cocker Spaniel',
    weightLbs: 28,
    size: 'medium',
    gender: 'female',
    coatType: 'long',
  },
  {
    ownerEmail: 'rachel@example.com',
    name: 'Hazel',
    breed: 'Cocker Spaniel',
    weightLbs: 15,
    size: 'small',
    gender: 'female',
    coatType: 'long',
    isPuppy: true,
    specialNotes: 'Puppy — born late 2025',
  },
  // Justin
  {
    ownerEmail: 'justin@example.com',
    name: 'Apollo',
    breed: 'Labradoodle',
    weightLbs: 60,
    size: 'large',
    gender: 'male',
    coatType: 'curly',
  },
  // Megan
  {
    ownerEmail: 'megan@example.com',
    name: 'Stella',
    breed: 'Maltipoo',
    weightLbs: 12,
    size: 'small',
    gender: 'female',
    coatType: 'curly',
  },
  // Anthony — one-time
  {
    ownerEmail: 'anthony@example.com',
    name: 'Riley',
    breed: 'Mini Schnauzer',
    weightLbs: 18,
    size: 'small',
    gender: 'female',
    coatType: 'medium',
  },
  // Heather — 1 active + 1 inactive (deceased)
  {
    ownerEmail: 'heather@example.com',
    name: 'Toby',
    breed: 'Yorkshire Terrier',
    weightLbs: 5,
    size: 'small',
    gender: 'male',
    coatType: 'long',
  },
  {
    ownerEmail: 'heather@example.com',
    name: 'Pixie',
    breed: 'Yorkshire Terrier',
    weightLbs: 4,
    size: 'small',
    gender: 'female',
    coatType: 'long',
    isActive: false,
    isSenior: true,
    specialNotes: 'Passed away — kept for records',
  },
  // Brian — lapsed
  {
    ownerEmail: 'brian@example.com',
    name: 'Oscar',
    breed: 'Pug',
    weightLbs: 19,
    size: 'small',
    gender: 'male',
    coatType: 'short',
    isSenior: true,
  },
  // Olivia — 1 dog + 1 cat
  {
    ownerEmail: 'olivia@example.com',
    name: 'Mochi',
    breed: 'Maltipoo',
    weightLbs: 10,
    size: 'small',
    gender: 'female',
    coatType: 'curly',
  },
  {
    ownerEmail: 'olivia@example.com',
    name: 'Biscuit',
    breed: 'Domestic Shorthair',
    weightLbs: 10,
    size: 'small',
    gender: 'male',
    coatType: 'short',
    species: 'cat',
  },
];

// ─── Service selection logic ─────────────────────────────

/** Picks an appropriate primary service for a pet, with some variation. */
function pickPrimaryService(pet: PetData, daysAgo: number, rng: () => number): string {
  // Cats always get cat services
  if (pet.species === 'cat') return 'Cat Bath';

  // Puppies get a puppy groom for their first ~3 visits, mixed with bath
  if (pet.isPuppy) {
    return rng() < 0.6 ? "Puppy's First Groom" : 'Bath & Brush';
  }

  // Senior pets occasionally get the senior groom variant
  if (pet.isSenior && rng() < 0.5) return 'Senior Groom';

  const month = monthOf(daysAgo);
  const isShedSeason = month >= 3 && month <= 5; // March-May
  const isDoubleCoat = pet.coatType === 'double';

  // Heavy shedders in spring → de-shedding more often
  if ((isDoubleCoat || pet.coatType === 'long') && isShedSeason && rng() < 0.25) {
    return 'De-shedding Treatment';
  }

  // Variation mix: 70% primary, 15% downsell, 10% upsell, 5% specialty
  const variation = rng();

  if (variation < 0.05) {
    // Specialty/basic — nail trim or pawdicure only
    return rng() < 0.6 ? 'Nail Trim' : 'Pawdicure';
  }

  if (variation < 0.15) {
    // Downsell — Express Bath or Bath & Brush
    return rng() < 0.5 ? 'Express Bath' : 'Bath & Brush';
  }

  if (variation < 0.25) {
    // Upsell — Spa Bath
    return 'Spa Bath';
  }

  // Primary pick based on coat
  if (pet.coatType === 'curly') return 'Doodle / Breed Cut Groom';
  if (pet.coatType === 'long' || pet.coatType === 'double') {
    return rng() < 0.7 ? 'Full Groom' : 'Bath & Brush';
  }
  // Short / medium coats — usually just a bath
  return rng() < 0.65 ? 'Bath & Brush' : 'Full Groom';
}

/** Picks 0-2 addons appropriate for the chosen service, weighted by season. */
function pickAddons(
  serviceName: string,
  addonAvailability: Record<string, string[]>,
  daysAgo: number,
  rng: () => number,
): string[] {
  const available = addonAvailability[serviceName];
  if (!available || available.length === 0) return [];

  const month = monthOf(daysAgo);
  const isHolidaySeason = month === 11 || month === 12; // Nov-Dec
  const baseAttachRate = isHolidaySeason ? 0.75 : 0.55;

  const r = rng();
  let count: number;
  if (r < 1 - baseAttachRate) count = 0;
  else if (r < 1 - baseAttachRate * 0.35) count = 1;
  else count = 2;

  if (count === 0) return [];

  const picks = new Set<string>();
  let attempts = 0;
  while (picks.size < count && attempts < 10) {
    picks.add(pickOne(rng, available));
    attempts++;
  }
  return [...picks];
}

// ─── Main seed ───────────────────────────────────────────

async function seedTestData() {
  console.log('🧪 Seeding test data for reports...\n');

  const rng = makeRng(RNG_SEED);

  // ─── Lookups ─────────────────────────────────────────
  const allRoles = await db.select().from(roles);
  const roleMap = Object.fromEntries(allRoles.map((r) => [r.name, r.id]));

  const allSizes = await db.select().from(petSizeCategories);
  const sizeMap = Object.fromEntries(allSizes.map((s) => [s.name, s.id]));

  const allServices = await db.select().from(services);
  const svcMap = Object.fromEntries(allServices.map((s) => [s.name, s.id]));
  const svcByIdMap = Object.fromEntries(allServices.map((s) => [s.id, s]));

  if (!roleMap['Customer'] || !roleMap['Groomer'] || !roleMap['Bather'] || !roleMap['Front Desk']) {
    throw new Error('Missing roles — run the base seed first (npm run db:seed)');
  }
  if (Object.keys(svcMap).length === 0) {
    throw new Error('Missing services — run the base seed first (npm run db:seed)');
  }

  const passwordHash = await hashPassword('password123');

  // ─── 1. Employees ────────────────────────────────────
  const employeeIds: Record<string, string> = {};

  for (const emp of employeeData) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emp.email))
      .limit(1);

    let userId: string;
    if (existing.length > 0) {
      userId = existing[0]!.id;
    } else {
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
      userId = user!.id;
    }
    employeeIds[emp.email] = userId;

    await db.insert(userRoles).values({ userId, roleId: roleMap[emp.role]! }).onConflictDoNothing();
    await db
      .insert(userRoles)
      .values({ userId, roleId: roleMap['Employee']! })
      .onConflictDoNothing();

    // Schedule
    for (const day of emp.schedule.days) {
      await db
        .insert(employeeSchedules)
        .values({
          userId,
          dayOfWeek: day,
          startTime: emp.schedule.start,
          endTime: emp.schedule.end,
          isAvailable: true,
        })
        .onConflictDoNothing();
    }
  }

  console.log(`✓ Employees seeded (${employeeData.length})`);

  // ─── 2. Employee-service competencies ────────────────
  const allServiceNames = allServices.filter((s) => !s.isAddon).map((s) => s.name);
  const batherServices = allServiceNames.filter((n) => !groomerOnlyServices.has(n));
  const addonServiceNames = allServices.filter((s) => s.isAddon).map((s) => s.name);

  for (const emp of employeeData) {
    const userId = employeeIds[emp.email]!;
    if (emp.role === 'Front Desk') continue;

    let serviceNamesForEmp: string[];
    if (emp.role === 'Groomer') {
      serviceNamesForEmp = [...allServiceNames, ...addonServiceNames];
      // Cat services restricted to specialists
      if (!catSpecialists.has(emp.email)) {
        serviceNamesForEmp = serviceNamesForEmp.filter(
          (n) => n !== 'Cat Bath' && n !== 'Cat Groom',
        );
      }
    } else {
      // Bathers — basic services + addons that go with them
      serviceNamesForEmp = [
        ...batherServices,
        'Cologne Spritz',
        'Flea & Tick Treatment',
        'Sanitary Trim',
        'Paw Balm',
        'Bow / Bandana',
        'Nail Painting',
        'Blueberry Facial',
      ];
      // Bathers don't do cats either
      serviceNamesForEmp = serviceNamesForEmp.filter((n) => n !== 'Cat Bath' && n !== 'Cat Groom');
    }

    for (const name of serviceNamesForEmp) {
      const serviceId = svcMap[name];
      if (!serviceId) continue;
      await db.insert(employeeServices).values({ userId, serviceId }).onConflictDoNothing();
    }
  }

  console.log('✓ Employee-service competencies seeded');

  // ─── 3. Customers ────────────────────────────────────
  const customerIds: Record<string, string> = {};

  for (const cust of customerData) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, cust.email))
      .limit(1);

    let userId: string;
    if (existing.length > 0) {
      userId = existing[0]!.id;
    } else {
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
      userId = user!.id;
    }
    customerIds[cust.email] = userId;

    await db
      .insert(userRoles)
      .values({ userId, roleId: roleMap['Customer']! })
      .onConflictDoNothing();
  }

  console.log(`✓ Customers seeded (${customerData.length})`);

  // ─── 4. Pets ─────────────────────────────────────────
  const petIdsByOwnerAndName: Record<string, string> = {}; // key: `${email}:${petName}`

  for (const p of petData) {
    const ownerId = customerIds[p.ownerEmail];
    if (!ownerId) continue;

    const [pet] = await db
      .insert(pets)
      .values({
        ownerId,
        name: p.name,
        breed: p.breed,
        weightLbs: p.weightLbs,
        sizeCategoryId: sizeMap[p.size],
        gender: p.gender,
        coatType: p.coatType,
        isActive: p.isActive ?? true,
        specialNotes: p.specialNotes,
      })
      .returning();
    petIdsByOwnerAndName[`${p.ownerEmail}:${p.name}`] = pet!.id;
  }

  const activePets = petData.filter((p) => p.isActive ?? true);
  console.log(`✓ Pets seeded (${petData.length} total, ${activePets.length} active)`);

  // ─── 5. Build pricing & addon-availability lookups ───
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

  // Build addon availability map from service_addons table
  const { serviceAddons } = await import('./schema');
  const allAddonLinks = await db.select().from(serviceAddons);
  const addonAvailabilityMap: Record<string, string[]> = {};
  for (const link of allAddonLinks) {
    const baseName = svcByIdMap[link.baseServiceId]?.name;
    const addonName = svcByIdMap[link.addonServiceId]?.name;
    if (!baseName || !addonName) continue;
    if (!addonAvailabilityMap[baseName]) addonAvailabilityMap[baseName] = [];
    addonAvailabilityMap[baseName].push(addonName);
  }

  // ─── 6. Bundle lookup ────────────────────────────────
  const allBundleRows = await db.select().from(bundlesTable);
  const bundleByName = Object.fromEntries(allBundleRows.map((b) => [b.name, b]));

  const allBundleSvcs = await db.select().from(bundleServices);
  const bundleServiceMap: Record<string, string[]> = {}; // bundle name -> service names
  for (const bs of allBundleSvcs) {
    const bundleName = allBundleRows.find((b) => b.id === bs.bundleId)?.name;
    const svcName = svcByIdMap[bs.serviceId]?.name;
    if (!bundleName || !svcName) continue;
    if (!bundleServiceMap[bundleName]) bundleServiceMap[bundleName] = [];
    bundleServiceMap[bundleName].push(svcName);
  }

  // ─── 7. Pick groomer for an appointment ──────────────
  function pickGroomer(serviceName: string, daysAgo: number, rng: () => number): string | null {
    const dow = dayOfWeek(daysAgo);
    const eligible = employeeData.filter((emp) => {
      if (emp.role === 'Front Desk') return false;
      if (!emp.schedule.days.includes(dow)) return false;
      if (groomerOnlyServices.has(serviceName) && emp.role !== 'Groomer') return false;
      if (
        (serviceName === 'Cat Bath' || serviceName === 'Cat Groom') &&
        !catSpecialists.has(emp.email)
      )
        return false;
      return true;
    });
    if (eligible.length === 0) return null;
    return employeeIds[pickOne(rng, eligible).email] ?? null;
  }

  function pickStartTime(emp: EmployeeData, durationMinutes: number, rng: () => number): string {
    // Pick a half-hour slot within the employee's schedule that fits the duration
    const [startH = 0] = emp.schedule.start.split(':').map(Number);
    const [endH = 0] = emp.schedule.end.split(':').map(Number);
    const lastStartHour = endH - Math.ceil(durationMinutes / 60);
    if (lastStartHour < startH) return emp.schedule.start;

    const hour = startH + Math.floor(rng() * (lastStartHour - startH + 1));
    const minute = rng() < 0.5 ? '00' : '30';
    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  // ─── 8. Generate appointments ────────────────────────

  interface ApptSpec {
    customerEmail: string;
    petName: string;
    petSize: PetData['size'];
    serviceName: string;
    addonNames: string[];
    bundleName?: string;
    groomerEmail: string;
    daysAgo: number;
    startTime: string;
    status: string;
  }

  const apptSpecs: ApptSpec[] = [];

  for (const cust of customerData) {
    if (cust.profile === 'inactive') continue;

    const ownedPets = petData.filter((p) => p.ownerEmail === cust.email && (p.isActive ?? true));
    if (ownedPets.length === 0) continue;

    const spec = profileSpecs[cust.profile];

    for (const pet of ownedPets) {
      // Generate visit dates by walking back from today at cadence intervals
      const visits: number[] = [];

      if (cust.profile === 'one_time') {
        // Single visit somewhere 30-180 days ago
        visits.push(30 + Math.floor(rng() * 150));
      } else {
        let dayPointer = spec.minDaysAgo + Math.floor(rng() * spec.cadenceDays);
        while (dayPointer <= spec.startDaysAgo) {
          const jittered = dayPointer + Math.floor((rng() - 0.5) * 2 * spec.jitterDays);
          if (jittered >= spec.minDaysAgo && jittered <= spec.startDaysAgo) {
            visits.push(jittered);
          }
          dayPointer += spec.cadenceDays;
        }
      }

      for (const daysAgoBase of visits) {
        // Skip Sundays — shop is closed
        let daysAgo = daysAgoBase;
        const dow = dayOfWeek(daysAgo);
        if (dow === 0) daysAgo -= 1; // shift to Saturday

        // Decide service mix — possibly use a bundle
        const bundleRoll = rng();
        let serviceName: string;
        let addonNames: string[];
        let bundleName: string | undefined;

        if (bundleRoll < 0.08 && pet.species !== 'cat') {
          // Spa Day bundle (~8%)
          bundleName = 'Spa Day';
          serviceName = 'Spa Bath';
          addonNames = ['Blueberry Facial', 'Paw Balm', 'Cologne Spritz'];
        } else if (bundleRoll < 0.15 && pet.species !== 'cat') {
          // Fresh & Clean bundle (~7%)
          bundleName = 'Fresh & Clean';
          serviceName = 'Bath & Brush';
          addonNames = ['Nail Trim', 'Ear Plucking'];
        } else {
          serviceName = pickPrimaryService(pet, daysAgo, rng);
          addonNames = pickAddons(serviceName, addonAvailabilityMap, daysAgo, rng);
        }

        // Pick groomer
        const groomerId = pickGroomer(serviceName, daysAgo, rng);
        if (!groomerId) continue; // shop closed that day for this service
        const groomerEmail = Object.entries(employeeIds).find(([, id]) => id === groomerId)?.[0]!;
        const groomerEmp = employeeData.find((e) => e.email === groomerEmail)!;

        // Pick time
        const pricing = getPrice(serviceName, pet.size);
        const startTime = pickStartTime(groomerEmp, pricing.durationMinutes, rng);

        // Pick status
        let status: string;
        const statusRoll = rng();
        if (daysAgo < 0) {
          status = statusRoll < 0.7 ? 'confirmed' : 'pending';
        } else if (daysAgo === 0) {
          status = statusRoll < 0.4 ? 'in_progress' : statusRoll < 0.7 ? 'confirmed' : 'pending';
        } else {
          if (statusRoll < 0.87) status = 'completed';
          else if (statusRoll < 0.92) status = 'cancelled';
          else if (statusRoll < 0.95) status = 'no_show';
          else status = 'completed';
        }

        apptSpecs.push({
          customerEmail: cust.email,
          petName: pet.name,
          petSize: pet.size,
          serviceName,
          addonNames,
          bundleName,
          groomerEmail,
          daysAgo,
          startTime,
          status,
        });
      }
    }
  }

  // Add some upcoming appointments (next 14 days)
  const upcomingCustomers: Array<{
    email: string;
    petName: string;
    daysAhead: number;
    service: string;
    addons: string[];
    bundle?: string;
  }> = [
    {
      email: 'sarah@example.com',
      petName: 'Buddy',
      daysAhead: 2,
      service: 'Full Groom',
      addons: ['Teeth Brushing'],
    },
    {
      email: 'jennifer@example.com',
      petName: 'Coco',
      daysAhead: 3,
      service: 'Doodle / Breed Cut Groom',
      addons: ['Bow / Bandana'],
    },
    {
      email: 'amandah@example.com',
      petName: 'Teddy',
      daysAhead: 5,
      service: 'Spa Bath',
      addons: ['Blueberry Facial', 'Paw Balm', 'Cologne Spritz'],
      bundle: 'Spa Day',
    },
    {
      email: 'james@example.com',
      petName: 'Luna',
      daysAhead: 6,
      service: 'Bath & Brush',
      addons: ['Cologne Spritz'],
    },
    {
      email: 'stephanie@example.com',
      petName: 'Roxy',
      daysAhead: 7,
      service: 'De-shedding Treatment',
      addons: [],
    },
    {
      email: 'megan@example.com',
      petName: 'Stella',
      daysAhead: 8,
      service: 'Doodle / Breed Cut Groom',
      addons: ['Nail Painting', 'Bow / Bandana'],
    },
    {
      email: 'nicole@example.com',
      petName: 'Whiskers',
      daysAhead: 10,
      service: 'Cat Bath',
      addons: ['Conditioning Mask'],
    },
    {
      email: 'olivia@example.com',
      petName: 'Mochi',
      daysAhead: 11,
      service: 'Bath & Brush',
      addons: ['Nail Trim', 'Ear Plucking'],
      bundle: 'Fresh & Clean',
    },
    {
      email: 'rachel@example.com',
      petName: 'Hazel',
      daysAhead: 13,
      service: "Puppy's First Groom",
      addons: ['Bow / Bandana'],
    },
  ];

  for (const u of upcomingCustomers) {
    const pet = petData.find((p) => p.ownerEmail === u.email && p.name === u.petName);
    if (!pet) continue;
    const daysAgo = -u.daysAhead;
    if (dayOfWeek(daysAgo) === 0) continue; // skip Sundays

    const groomerId = pickGroomer(u.service, daysAgo, rng);
    if (!groomerId) continue;
    const groomerEmail = Object.entries(employeeIds).find(([, id]) => id === groomerId)?.[0]!;
    const groomerEmp = employeeData.find((e) => e.email === groomerEmail)!;
    const pricing = getPrice(u.service, pet.size);
    const startTime = pickStartTime(groomerEmp, pricing.durationMinutes, rng);

    apptSpecs.push({
      customerEmail: u.email,
      petName: pet.name,
      petSize: pet.size,
      serviceName: u.service,
      addonNames: u.addons,
      bundleName: u.bundle,
      groomerEmail,
      daysAgo,
      startTime,
      status: rng() < 0.75 ? 'confirmed' : 'pending',
    });
  }

  // ─── 9. Write appointments to DB ─────────────────────
  let completedCount = 0;
  let bundleCount = 0;
  let totalRevenueCents = 0;

  for (const spec of apptSpecs) {
    const customerId = customerIds[spec.customerEmail];
    const petId = petIdsByOwnerAndName[`${spec.customerEmail}:${spec.petName}`];
    const groomerId = employeeIds[spec.groomerEmail];
    if (!customerId || !petId || !groomerId) continue;

    const pricing = getPrice(spec.serviceName, spec.petSize);
    const scheduledDate = dateOffset(spec.daysAgo);
    const baseDuration = pricing.durationMinutes;

    // Sum addon durations
    let totalDuration = baseDuration;
    let addonSubtotal = 0;
    const addonPricings: Array<{ name: string; priceCents: number }> = [];
    for (const addonName of spec.addonNames) {
      const ap = getPrice(addonName, spec.petSize);
      totalDuration += ap.durationMinutes;
      addonSubtotal += ap.priceCents;
      addonPricings.push({ name: addonName, priceCents: ap.priceCents });
    }

    const endTime = addMinutes(spec.startTime, totalDuration);

    // Create appointment
    const [appt] = await db
      .insert(appointments)
      .values({
        customerId,
        status: spec.status,
        createdAt: dayOffset(spec.daysAgo + 3),
        updatedAt: dayOffset(Math.max(spec.daysAgo, 0)),
      })
      .returning();

    // Create appointment pet
    const [apptPet] = await db
      .insert(appointmentPets)
      .values({
        appointmentId: appt!.id,
        petId,
        assignedGroomerId: groomerId,
        scheduledDate,
        startTime: spec.startTime,
        endTime,
        estimatedDurationMinutes: totalDuration,
        status: spec.status,
      })
      .returning();

    // Base service
    await db.insert(appointmentServices).values({
      appointmentPetId: apptPet!.id,
      serviceId: svcMap[spec.serviceName]!,
      priceAtBookingCents: pricing.priceCents,
      durationAtBookingMinutes: pricing.durationMinutes,
    });

    // Addons
    for (const ap of addonPricings) {
      await db.insert(appointmentAddons).values({
        appointmentPetId: apptPet!.id,
        serviceId: svcMap[ap.name]!,
        priceAtBookingCents: ap.priceCents,
      });
    }

    // Bundle (if any)
    let discountCents = 0;
    if (spec.bundleName) {
      const bundle = bundleByName[spec.bundleName];
      if (bundle) {
        const subtotal = pricing.priceCents + addonSubtotal;
        if (bundle.discountType === 'percent') {
          discountCents = Math.round((subtotal * bundle.discountValue) / 100);
        } else {
          discountCents = Math.min(bundle.discountValue, subtotal);
        }
        await db.insert(appointmentBundles).values({
          appointmentPetId: apptPet!.id,
          bundleId: bundle.id,
          discountAppliedCents: discountCents,
        });
        bundleCount++;
      }
    }

    // Invoice + payment for completed appointments
    if (spec.status === 'completed') {
      completedCount++;
      const subtotalCents = pricing.priceCents + addonSubtotal;
      const afterDiscount = subtotalCents - discountCents;
      const taxCents = Math.round(afterDiscount * 0.08);
      const tipCents = Math.round(afterDiscount * rng() * 0.2);
      const totalCents = afterDiscount + taxCents + tipCents;
      totalRevenueCents += totalCents;

      const [invoice] = await db
        .insert(invoices)
        .values({
          appointmentId: appt!.id,
          subtotalCents,
          discountCents,
          taxCents,
          tipCents,
          totalCents,
          status: 'paid',
          paidAt: dayOffset(spec.daysAgo),
          createdAt: dayOffset(spec.daysAgo),
        })
        .returning();

      await db.insert(invoiceLineItems).values({
        invoiceId: invoice!.id,
        description: spec.serviceName,
        amountCents: pricing.priceCents,
        type: 'service',
      });

      for (const ap of addonPricings) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoice!.id,
          description: ap.name,
          amountCents: ap.priceCents,
          type: 'addon',
        });
      }

      if (discountCents > 0) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoice!.id,
          description: `Bundle discount: ${spec.bundleName}`,
          amountCents: -discountCents,
          type: 'discount',
        });
      }

      if (taxCents > 0) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoice!.id,
          description: 'Tax',
          amountCents: taxCents,
          type: 'tax',
        });
      }

      if (tipCents > 0) {
        await db.insert(invoiceLineItems).values({
          invoiceId: invoice!.id,
          description: 'Tip',
          amountCents: tipCents,
          type: 'tip',
        });
      }

      await db.insert(payments).values({
        appointmentId: appt!.id,
        amountCents: totalCents,
        status: 'captured',
        provider: 'stripe',
        transactionId: `pi_test_${appt!.id.slice(0, 8)}`,
        tipCents,
        createdAt: dayOffset(spec.daysAgo),
      });
    }
  }

  // ─── Summary ─────────────────────────────────────────
  console.log(
    `✓ Appointments seeded (${apptSpecs.length} total, ${completedCount} completed, ${bundleCount} with bundles)`,
  );
  console.log(`  Total test revenue: $${(totalRevenueCents / 100).toFixed(2)}`);

  console.log('\n✅ Test data seed complete!');
  console.log(`  Employees: ${employeeData.length} (3 groomers, 2 bathers, 1 front desk)`);
  console.log(`  Customers: ${customerData.length}`);
  console.log(
    `  Pets: ${petData.length} (${activePets.length} active, ${petData.length - activePets.length} inactive)`,
  );
  console.log(
    `  Appointments: ${apptSpecs.length} over ${HISTORY_DAYS}-day history + ${FUTURE_DAYS}-day forecast`,
  );
  console.log('  Statuses: completed, cancelled, no_show, in_progress, confirmed, pending');
  console.log('\n  All test user passwords: password123');

  process.exit(0);
}

seedTestData().catch((err) => {
  console.error('❌ Test data seed failed:', err);
  process.exit(1);
});
