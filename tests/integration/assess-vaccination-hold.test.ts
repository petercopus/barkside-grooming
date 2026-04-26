/**
 * AI assisted with this file
 */
import { eq, inArray } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { db } from '~~/server/db';
import { appointmentPets, appointments, documents, pets, users } from '~~/server/db/schema';
import {
  assessVaccinationHold,
  clearHoldIfSatisfied,
} from '~~/server/services/vaccination-hold.service';

/* ─────────────────────────────────── *
 * Fixtures
 * ─────────────────────────────────── */

async function insertCustomer(): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({
      email: `assess-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: null,
      firstName: 'Assess',
      lastName: 'Test',
    })
    .returning({ id: users.id });
  return u!.id;
}

async function insertPet(ownerId: string, name = 'Rex'): Promise<string> {
  const [p] = await db.insert(pets).values({ ownerId, name }).returning({ id: pets.id });
  return p!.id;
}

async function insertVaccinationDoc(
  petId: string,
  status: 'pending' | 'approved' | 'rejected',
): Promise<string> {
  const [d] = await db
    .insert(documents)
    .values({
      petId,
      type: 'vaccination_record',
      filePath: `s3://test/${Math.random().toString(36).slice(2)}`,
      fileName: 'vax.pdf',
      status,
    })
    .returning({ id: documents.id });
  return d!.id;
}

async function insertAppointment(opts: {
  customerId: string | null;
  status: 'pending_documents' | 'confirmed' | 'cancelled';
  documentsHoldExpiresAt?: Date | null;
  scheduledDate?: string;
  appointmentPets: Array<{ petId: string | null; guestPetName?: string }>;
}): Promise<string> {
  const [appt] = await db
    .insert(appointments)
    .values({
      customerId: opts.customerId,
      status: opts.status,
      documentsHoldExpiresAt: opts.documentsHoldExpiresAt ?? null,
    })
    .returning({ id: appointments.id });

  for (const ap of opts.appointmentPets) {
    await db.insert(appointmentPets).values({
      appointmentId: appt!.id,
      petId: ap.petId,
      guestPetName: ap.guestPetName ?? null,
      scheduledDate: opts.scheduledDate ?? '2099-01-01',
      startTime: '10:00:00',
      endTime: '11:00:00',
      estimatedDurationMinutes: 60,
      status: 'pending',
    });
  }

  return appt!.id;
}

/* ─────────────────────────────────── *
 * Tests — assessVaccinationHold
 * ─────────────────────────────────── */

describe('assessVaccinationHold', () => {
  const createdAppointmentIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdPetIds: string[] = [];
  const createdDocIds: string[] = [];

  afterEach(async () => {
    if (createdDocIds.length) {
      await db.delete(documents).where(inArray(documents.id, createdDocIds));
    }
    if (createdAppointmentIds.length) {
      await db.delete(appointments).where(inArray(appointments.id, createdAppointmentIds));
    }
    if (createdPetIds.length) {
      await db.delete(pets).where(inArray(pets.id, createdPetIds));
    }
    if (createdUserIds.length) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdDocIds.length = 0;
    createdAppointmentIds.length = 0;
    createdPetIds.length = 0;
    createdUserIds.length = 0;
  });

  it('returns empty when every registered pet has an approved vaccination_record', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);
    const petId = await insertPet(customerId);
    createdPetIds.push(petId);
    const docId = await insertVaccinationDoc(petId, 'approved');
    createdDocIds.push(docId);

    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      appointmentPets: [{ petId }],
    });
    createdAppointmentIds.push(apptId);

    expect(await assessVaccinationHold(apptId)).toEqual([]);
  });

  it('treats a pending vaccination_record as satisfying the hold', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);
    const petId = await insertPet(customerId);
    createdPetIds.push(petId);
    const docId = await insertVaccinationDoc(petId, 'pending');
    createdDocIds.push(docId);

    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      appointmentPets: [{ petId }],
    });
    createdAppointmentIds.push(apptId);

    expect(await assessVaccinationHold(apptId)).toEqual([]);
  });

  it('does NOT count a rejected vaccination_record as satisfying', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);
    const petId = await insertPet(customerId, 'Bella');
    createdPetIds.push(petId);
    const docId = await insertVaccinationDoc(petId, 'rejected');
    createdDocIds.push(docId);

    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      appointmentPets: [{ petId }],
    });
    createdAppointmentIds.push(apptId);

    const missing = await assessVaccinationHold(apptId);
    expect(missing).toHaveLength(1);
    expect(missing[0]?.petId).toBe(petId);
    expect(missing[0]?.displayName).toBe('Bella');
  });

  it('flags guest pets (petId NULL) as missing regardless of any documents', async () => {
    const apptId = await insertAppointment({
      customerId: null,
      status: 'pending_documents',
      appointmentPets: [{ petId: null, guestPetName: 'GuestPup' }],
    });
    createdAppointmentIds.push(apptId);

    const missing = await assessVaccinationHold(apptId);
    expect(missing).toHaveLength(1);
    expect(missing[0]?.petId).toBeNull();
    expect(missing[0]?.displayName).toBe('GuestPup');
  });

  it('returns "Pet" as a fallback when guestPetName is null', async () => {
    const apptId = await insertAppointment({
      customerId: null,
      status: 'pending_documents',
      appointmentPets: [{ petId: null }],
    });
    createdAppointmentIds.push(apptId);

    const missing = await assessVaccinationHold(apptId);
    expect(missing[0]?.displayName).toBe('Pet');
  });

  it('returns only the pets that are actually missing in a mixed appointment', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);
    const ok = await insertPet(customerId, 'OkPet');
    const missingPet = await insertPet(customerId, 'NeedyPet');
    createdPetIds.push(ok, missingPet);
    const docId = await insertVaccinationDoc(ok, 'approved');
    createdDocIds.push(docId);

    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      appointmentPets: [{ petId: ok }, { petId: missingPet }],
    });
    createdAppointmentIds.push(apptId);

    const missing = await assessVaccinationHold(apptId);
    expect(missing).toHaveLength(1);
    expect(missing[0]?.petId).toBe(missingPet);
    expect(missing[0]?.displayName).toBe('NeedyPet');
  });
});

/* ─────────────────────────────────── *
 * Tests — clearHoldIfSatisfied
 * ─────────────────────────────────── */

describe('clearHoldIfSatisfied', () => {
  const createdAppointmentIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdPetIds: string[] = [];
  const createdDocIds: string[] = [];

  afterEach(async () => {
    if (createdDocIds.length) {
      await db.delete(documents).where(inArray(documents.id, createdDocIds));
    }
    if (createdAppointmentIds.length) {
      await db.delete(appointments).where(inArray(appointments.id, createdAppointmentIds));
    }
    if (createdPetIds.length) {
      await db.delete(pets).where(inArray(pets.id, createdPetIds));
    }
    if (createdUserIds.length) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
    createdDocIds.length = 0;
    createdAppointmentIds.length = 0;
    createdPetIds.length = 0;
    createdUserIds.length = 0;
  });

  it('transitions pending_documents → confirmed and clears the hold timestamp when all pets are satisfied', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);
    const petId = await insertPet(customerId);
    createdPetIds.push(petId);
    const docId = await insertVaccinationDoc(petId, 'approved');
    createdDocIds.push(docId);

    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: new Date(Date.now() + 24 * 3600_000),
      appointmentPets: [{ petId }],
    });
    createdAppointmentIds.push(apptId);

    await clearHoldIfSatisfied(apptId);

    const [after] = await db
      .select({
        status: appointments.status,
        hold: appointments.documentsHoldExpiresAt,
      })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('confirmed');
    expect(after?.hold).toBeNull();

    const apPets = await db
      .select({ status: appointmentPets.status })
      .from(appointmentPets)
      .where(eq(appointmentPets.appointmentId, apptId));
    expect(apPets.every((p) => p.status === 'confirmed')).toBe(true);
  });

  it('does nothing when the appointment is not in pending_documents', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);
    const petId = await insertPet(customerId);
    createdPetIds.push(petId);
    const docId = await insertVaccinationDoc(petId, 'approved');
    createdDocIds.push(docId);

    const apptId = await insertAppointment({
      customerId,
      status: 'confirmed',
      documentsHoldExpiresAt: null,
      appointmentPets: [{ petId }],
    });
    createdAppointmentIds.push(apptId);

    await clearHoldIfSatisfied(apptId);

    const [after] = await db
      .select({ status: appointments.status })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('confirmed');
  });

  it('leaves the hold in place when at least one pet is still missing', async () => {
    const customerId = await insertCustomer();
    createdUserIds.push(customerId);
    const ok = await insertPet(customerId, 'OkPet');
    const missingPet = await insertPet(customerId, 'NeedyPet');
    createdPetIds.push(ok, missingPet);
    const docId = await insertVaccinationDoc(ok, 'approved');
    createdDocIds.push(docId);

    const holdExpiry = new Date(Date.now() + 24 * 3600_000);
    const apptId = await insertAppointment({
      customerId,
      status: 'pending_documents',
      documentsHoldExpiresAt: holdExpiry,
      appointmentPets: [{ petId: ok }, { petId: missingPet }],
    });
    createdAppointmentIds.push(apptId);

    await clearHoldIfSatisfied(apptId);

    const [after] = await db
      .select({
        status: appointments.status,
        hold: appointments.documentsHoldExpiresAt,
      })
      .from(appointments)
      .where(eq(appointments.id, apptId));
    expect(after?.status).toBe('pending_documents');
    expect(after?.hold).not.toBeNull();
  });
});
