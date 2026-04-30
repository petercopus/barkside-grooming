import { describe, expect, it } from 'vitest';
import { createBookingSchema, createGuestBookingSchema } from '~~/shared/schemas/appointment';
import { loginSchema, registerSchema } from '~~/shared/schemas/auth';
import { createBundleSchema, updateBundleSchema } from '~~/shared/schemas/bundle';
import { createPetSchema, updatePetSchema } from '~~/shared/schemas/pet';

describe('registerSchema', () => {
  const valid = {
    email: 'a@b.com',
    password: 'password123',
    firstName: 'A',
    lastName: 'B',
  };

  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(registerSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects passwords shorter than 8 chars', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
  });

  it('rejects empty firstName or lastName', () => {
    expect(registerSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, lastName: '' }).success).toBe(false);
  });

  it('accepts an optional phone', () => {
    expect(registerSchema.safeParse({ ...valid, phone: '555-0100' }).success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('only requires a non-empty password (does not enforce 8-char rule on login)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rejects empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('createPetSchema', () => {
  it('accepts a minimal valid pet', () => {
    expect(createPetSchema.safeParse({ name: 'Rex', weightLbs: 25 }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(createPetSchema.safeParse({ name: '', weightLbs: 25 }).success).toBe(false);
  });

  it('rejects a missing weight', () => {
    expect(createPetSchema.safeParse({ name: 'Rex' }).success).toBe(false);
  });

  it('rejects weights outside 1–300 lbs', () => {
    expect(createPetSchema.safeParse({ name: 'Rex', weightLbs: 0 }).success).toBe(false);
    expect(createPetSchema.safeParse({ name: 'Rex', weightLbs: 301 }).success).toBe(false);
  });

  it('rejects non-integer weights', () => {
    expect(createPetSchema.safeParse({ name: 'Rex', weightLbs: 25.5 }).success).toBe(false);
  });

  it('rejects an invalid gender enum', () => {
    expect(createPetSchema.safeParse({ name: 'Rex', gender: 'unknown' }).success).toBe(false);
  });

  it('rejects malformed dates', () => {
    expect(createPetSchema.safeParse({ name: 'Rex', dateOfBirth: '2025/01/01' }).success).toBe(
      false,
    );
  });
});

describe('updatePetSchema', () => {
  it('accepts an empty patch (all fields optional)', () => {
    expect(updatePetSchema.safeParse({}).success).toBe(true);
  });

  it('still validates the fields that are provided', () => {
    expect(updatePetSchema.safeParse({ weightLbs: -1 }).success).toBe(false);
  });
});

describe('createBundleSchema', () => {
  const valid = {
    name: 'Spa Day',
    discountType: 'percent' as const,
    discountValue: 10,
    serviceIds: [1, 2],
  };

  it('accepts a valid percent bundle with two services', () => {
    expect(createBundleSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects bundles with fewer than 2 services', () => {
    expect(createBundleSchema.safeParse({ ...valid, serviceIds: [1] }).success).toBe(false);
  });

  it('rejects an unknown discountType', () => {
    expect(createBundleSchema.safeParse({ ...valid, discountType: 'free' }).success).toBe(false);
  });

  it('rejects discountValue < 1', () => {
    expect(createBundleSchema.safeParse({ ...valid, discountValue: 0 }).success).toBe(false);
  });

  it('rejects non-integer discountValue', () => {
    expect(createBundleSchema.safeParse({ ...valid, discountValue: 10.5 }).success).toBe(false);
  });

  it('defaults isActive to true', () => {
    const parsed = createBundleSchema.parse(valid);
    expect(parsed.isActive).toBe(true);
  });
});

describe('updateBundleSchema', () => {
  it('accepts a partial update', () => {
    expect(updateBundleSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
  });

  it('accepts an empty patch', () => {
    expect(updateBundleSchema.safeParse({}).success).toBe(true);
  });
});

describe('createBookingSchema', () => {
  const validPet = {
    petId: '11111111-1111-4111-8111-111111111111',
    serviceIds: [1],
    groomerId: '22222222-2222-4222-8222-222222222222',
    scheduledDate: '2026-05-01',
    startTime: '09:00',
  };

  it('accepts a minimal valid booking', () => {
    expect(createBookingSchema.safeParse({ pets: [validPet] }).success).toBe(true);
  });

  it('rejects an empty pets array', () => {
    expect(createBookingSchema.safeParse({ pets: [] }).success).toBe(false);
  });

  it('rejects a pet with no services', () => {
    expect(createBookingSchema.safeParse({ pets: [{ ...validPet, serviceIds: [] }] }).success).toBe(
      false,
    );
  });

  it('rejects a non-UUID petId', () => {
    expect(
      createBookingSchema.safeParse({ pets: [{ ...validPet, petId: 'not-a-uuid' }] }).success,
    ).toBe(false);
  });

  it('rejects a malformed scheduledDate', () => {
    expect(
      createBookingSchema.safeParse({ pets: [{ ...validPet, scheduledDate: '05/01/2026' }] })
        .success,
    ).toBe(false);
  });

  it('rejects a malformed startTime', () => {
    expect(
      createBookingSchema.safeParse({ pets: [{ ...validPet, startTime: '9:00' }] }).success,
    ).toBe(false);
  });

  it('accepts HH:MM:SS startTime', () => {
    expect(
      createBookingSchema.safeParse({ pets: [{ ...validPet, startTime: '09:00:00' }] }).success,
    ).toBe(true);
  });
});

describe('createGuestBookingSchema', () => {
  const validPet = {
    name: 'Rex',
    weightLbs: 30,
    serviceIds: [1],
    groomerId: '22222222-2222-4222-8222-222222222222',
    scheduledDate: '2026-05-01',
    startTime: '09:00',
  };
  const validGuest = {
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.com',
    phone: '555-0100',
  };

  it('accepts a valid guest booking', () => {
    expect(
      createGuestBookingSchema.safeParse({ pet: validPet, guestDetails: validGuest }).success,
    ).toBe(true);
  });

  it('requires guest weightLbs (used for pricing)', () => {
    const { weightLbs: _omit, ...petNoWeight } = validPet;
    void _omit;
    expect(
      createGuestBookingSchema.safeParse({ pet: petNoWeight, guestDetails: validGuest }).success,
    ).toBe(false);
  });

  it('requires guest phone', () => {
    const { phone: _omit, ...guestNoPhone } = validGuest;
    void _omit;
    expect(
      createGuestBookingSchema.safeParse({ pet: validPet, guestDetails: guestNoPhone }).success,
    ).toBe(false);
  });

  it('rejects an invalid guest email', () => {
    expect(
      createGuestBookingSchema.safeParse({
        pet: validPet,
        guestDetails: { ...validGuest, email: 'nope' },
      }).success,
    ).toBe(false);
  });
});
