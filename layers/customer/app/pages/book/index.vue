<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date';
import type { StepperItem } from '@nuxt/ui';

definePageMeta({
  layout: 'customer',
});

const { isLoggedIn } = useAuth();

/* ─────────────────────────────────── *
 * Stepper
 * ─────────────────────────────────── */
const step = ref(0);

const stepperItems: StepperItem[] = [
  {
    title: 'Pet',
    description: 'Pet info',
    icon: 'i-lucide-paw-print',
  },
  {
    title: 'Services',
    description: 'Select services',
    icon: 'i-lucide-scissors',
  },
  {
    title: 'Schedule',
    description: 'Pick date & time',
    icon: 'i-lucide-calendar',
  },
  {
    title: 'Finalize',
    icon: 'i-lucide-check',
  },
];

const canNextStep = computed(() => {
  const stepCheck = step.value < stepperItems.length;
  let additionalCheck;

  switch (step.value) {
    case 0:
      if (isLoggedIn.value) {
        additionalCheck = selectedPetIds.value.length > 0;
      } else {
        additionalCheck =
          guestPet.value.name.trim().length > 0 &&
          !!guestPet.value.weightLbs &&
          !!guestSizeCategoryId.value;
      }
      break;
    case 1:
      if (isLoggedIn.value) {
        additionalCheck = selectedPetIds.value.every(
          (id) => (petBaseServices.value[id] ?? []).length > 0,
        );
      } else {
        additionalCheck = guestBaseServices.value.length > 0;
      }
      break;
    case 2:
      if (isLoggedIn.value) {
        additionalCheck = selectedPetIds.value.every((id) => petSlots.value[id]);
      } else {
        additionalCheck = !!guestSlot.value;
      }
      break;
    case 3:
      if (isLoggedIn.value) return true;
      // guest must fill contact details
      additionalCheck =
        guestContact.value.firstName.trim().length > 0 &&
        guestContact.value.lastName.trim().length > 0 &&
        guestContact.value.email.trim().length > 0 &&
        guestContact.value.phone.trim().length > 0;
      break;
    default:
      return false;
  }

  return stepCheck && additionalCheck;
});
const canPrevStep = computed(() => step.value > 0);

function nextStep() {
  if (canNextStep.value) step.value++;
}
function prevStep() {
  if (canPrevStep.value) step.value--;
}

/* ─────────────────────────────────── *
 * Shared data fetches
 * ─────────────────────────────────── */
const { data: serviceData } = await useFetch('/api/services');
const { data: bundleData } = await useFetch('/api/bundles');
const { data: addonMapData } = await useFetch('/api/services/addon-map');
const { data: sizeCategoryData } = await useFetch('/api/size-categories');

/* ─────────────────────────────────── *
 * Auth'd flow: select registered pets
 * ─────────────────────────────────── */
const { data: petData } = isLoggedIn.value ? await useFetch('/api/pets') : { data: ref(null) };

const selectedPetIds = ref<string[]>([]);

const petBaseServices = ref<Record<string, number[]>>({});
const petAddons = ref<Record<string, number[]>>({});
const petBundles = ref<Record<string, { bundleId: number; discountCents: number } | null>>({});
const petSlots = ref<
  Record<string, { scheduledDate: string; groomerId: string; startTime: string }>
>({});
const petDates = ref<Record<string, CalendarDate | undefined>>({});
const petAvailability = ref<Record<string, any[]>>({});

/* ─────────────────────────────────── *
 * Guest flow: inline pet + contact
 * ─────────────────────────────────── */
const guestPet = ref({ name: '', breed: '', weightLbs: undefined as number | undefined });
const guestContact = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
});
const guestBaseServices = ref<number[]>([]);
const guestAddons = ref<number[]>([]);
const guestBundle = ref<{ bundleId: number; discountCents: number } | null>(null);
const guestSlot = ref<{ scheduledDate: string; groomerId: string; startTime: string } | null>(null);
const guestDate = ref<CalendarDate | undefined>();
const guestAvailability = ref<any[]>([]);
const notes = ref('');

/* ─────────────────────────────────── *
 * Guest: resolved size category
 * ─────────────────────────────────── */
const guestSizeCategoryId = computed(() => {
  if (!guestPet.value.weightLbs) return null;
  const categories = sizeCategoryData.value?.sizeCategories ?? [];
  const match = categories.find(
    (cat) =>
      guestPet.value.weightLbs! >= cat.minWeight && guestPet.value.weightLbs! <= cat.maxWeight,
  );
  return match?.id ?? null;
});

/* ─────────────────────────────────── *
 * Service/pricing helpers
 * ─────────────────────────────────── */

// Filter services that have pricing for a given size category
function servicesForSizeCategory(sizeCategoryId: number | null) {
  if (!sizeCategoryId) return [];
  return (serviceData.value?.services ?? [])
    .map((s) => {
      const pricing = s.pricing.find((p) => p.sizeCategoryId === sizeCategoryId);
      if (!pricing) return null;
      return { ...s, pricing };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// Auth'd flow: services available for a registered pet
function availableServicesForPet(petId: string) {
  const pet = petData.value?.pets.find((p) => p.id === petId);
  if (!pet?.sizeCategoryId) return [];
  return servicesForSizeCategory(pet.sizeCategoryId);
}

// Guest flow: services available for guest's resolved size
function availableServicesForGuest() {
  return servicesForSizeCategory(guestSizeCategoryId.value);
}

function baseServicesForPet(petId: string) {
  return availableServicesForPet(petId).filter((s) => !s.isAddon);
}

function baseServicesForGuest() {
  return availableServicesForGuest().filter((s) => !s.isAddon);
}

/* ─────────────────────────────────── *
 * Bundle helpers
 * ─────────────────────────────────── */
function availableBundlesForPet(petId: string) {
  const petServices = availableServicesForPet(petId);
  const petServiceIds = new Set(petServices.map((s) => s.id));
  return (bundleData.value?.bundles ?? []).filter((bundle) =>
    bundle.serviceIds.every((id) => petServiceIds.has(id)),
  );
}

function availableBundlesForGuest() {
  const guestServices = availableServicesForGuest();
  const guestServiceIds = new Set(guestServices.map((s) => s.id));
  return (bundleData.value?.bundles ?? []).filter((bundle) =>
    bundle.serviceIds.every((id) => guestServiceIds.has(id)),
  );
}

/* ─────────────────────────────────── *
 * Addon helpers
 * ─────────────────────────────────── */
function compatibleAddonsForPet(petId: string) {
  const baseIds = petBaseServices.value[petId] ?? [];
  if (!baseIds.length) return [];
  const addonMap = addonMapData.value?.addonMap ?? {};
  const compatibleAddonIds = new Set(baseIds.flatMap((id) => addonMap[id] ?? []));
  return availableServicesForPet(petId).filter((s) => s.isAddon && compatibleAddonIds.has(s.id));
}

function compatibleAddonsForGuest() {
  if (!guestBaseServices.value.length) return [];
  const addonMap = addonMapData.value?.addonMap ?? {};
  const compatibleAddonIds = new Set(guestBaseServices.value.flatMap((id) => addonMap[id] ?? []));
  return availableServicesForGuest().filter((s) => s.isAddon && compatibleAddonIds.has(s.id));
}

/* ─────────────────────────────────── *
 * Bundle partition + toggle (auth'd)
 * ─────────────────────────────────── */
function partitionBundleServices(
  allServices: ReturnType<typeof availableServicesForPet>,
  bundle: { serviceIds: number[] },
) {
  const baseIds = bundle.serviceIds.filter((id) => {
    const svc = allServices.find((s) => s.id === id);
    return svc && !svc.isAddon;
  });
  const addonIds = bundle.serviceIds.filter((id) => {
    const svc = allServices.find((s) => s.id === id);
    return svc?.isAddon;
  });
  return { baseIds, addonIds };
}

function computeBundleDiscount(
  allServices: ReturnType<typeof availableServicesForPet>,
  bundle: { discountType: string; discountValue: number; serviceIds: number[] },
) {
  const bundleTotal = bundle.serviceIds.reduce((sum, id) => {
    const svc = allServices.find((s) => s.id === id);
    return sum + (svc?.pricing.priceCents ?? 0);
  }, 0);

  return bundle.discountType === 'percent'
    ? Math.round(bundleTotal * (bundle.discountValue / 100))
    : bundle.discountValue;
}

function toggleBundlePet(petId: string, bundleId: number) {
  const current = petBundles.value[petId];
  const bundle = (bundleData.value?.bundles ?? []).find((b) => b.id === bundleId);
  if (!bundle) return;

  const allServices = availableServicesForPet(petId);
  const { baseIds, addonIds } = partitionBundleServices(allServices, bundle);

  if (current?.bundleId === bundleId) {
    petBundles.value[petId] = null;
    petBaseServices.value[petId] = (petBaseServices.value[petId] ?? []).filter(
      (id) => !baseIds.includes(id),
    );
    petAddons.value[petId] = (petAddons.value[petId] ?? []).filter((id) => !addonIds.includes(id));
    return;
  }

  petBaseServices.value[petId] = [
    ...new Set([...(petBaseServices.value[petId] ?? []), ...baseIds]),
  ];
  petAddons.value[petId] = [...new Set([...(petAddons.value[petId] ?? []), ...addonIds])];
  petBundles.value[petId] = { bundleId, discountCents: computeBundleDiscount(allServices, bundle) };
}

function autoDetectBundlePet(petId: string) {
  const baseIds = petBaseServices.value[petId] ?? [];
  const addonIds = petAddons.value[petId] ?? [];
  const allSelectedIds = new Set([...baseIds, ...addonIds]);

  const allServices = availableServicesForPet(petId);
  const available = availableBundlesForPet(petId);
  let bestBundle: (typeof available)[0] | null = null;
  let bestDiscount = 0;

  for (const bundle of available) {
    if (!bundle.serviceIds.every((id) => allSelectedIds.has(id))) continue;
    const discount = computeBundleDiscount(allServices, bundle);
    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestBundle = bundle;
    }
  }

  petBundles.value[petId] = bestBundle
    ? { bundleId: bestBundle.id, discountCents: bestDiscount }
    : null;
}

/* ─────────────────────────────────── *
 * Bundle toggle (guest)
 * ─────────────────────────────────── */
function toggleBundleGuest(bundleId: number) {
  const bundle = (bundleData.value?.bundles ?? []).find((b) => b.id === bundleId);
  if (!bundle) return;

  const allServices = availableServicesForGuest();
  const { baseIds, addonIds } = partitionBundleServices(allServices, bundle);

  if (guestBundle.value?.bundleId === bundleId) {
    guestBundle.value = null;
    guestBaseServices.value = guestBaseServices.value.filter((id) => !baseIds.includes(id));
    guestAddons.value = guestAddons.value.filter((id) => !addonIds.includes(id));
    return;
  }

  guestBaseServices.value = [...new Set([...guestBaseServices.value, ...baseIds])];
  guestAddons.value = [...new Set([...guestAddons.value, ...addonIds])];
  guestBundle.value = { bundleId, discountCents: computeBundleDiscount(allServices, bundle) };
}

function autoDetectBundleGuest() {
  const allSelectedIds = new Set([...guestBaseServices.value, ...guestAddons.value]);
  const allServices = availableServicesForGuest();
  const available = availableBundlesForGuest();
  let bestBundle: (typeof available)[0] | null = null;
  let bestDiscount = 0;

  for (const bundle of available) {
    if (!bundle.serviceIds.every((id) => allSelectedIds.has(id))) continue;
    const discount = computeBundleDiscount(allServices, bundle);
    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestBundle = bundle;
    }
  }

  guestBundle.value = bestBundle ? { bundleId: bestBundle.id, discountCents: bestDiscount } : null;
}

/* ─────────────────────────────────── *
 * Pricing totals
 * ─────────────────────────────────── */
function computeTotal(
  allServices: ReturnType<typeof availableServicesForPet>,
  baseIds: number[],
  addonIds: number[],
  discountCents: number,
) {
  const baseItems = baseIds.map((id) => {
    const svc = allServices.find((s) => s.id === id);
    return { name: svc?.name ?? '', priceCents: svc?.pricing.priceCents ?? 0 };
  });
  const addonItems = addonIds.map((id) => {
    const svc = allServices.find((s) => s.id === id);
    return { name: svc?.name ?? '', priceCents: svc?.pricing.priceCents ?? 0 };
  });
  const subtotal = [...baseItems, ...addonItems].reduce((sum, item) => sum + item.priceCents, 0);
  return { baseItems, addonItems, discountCents, subtotal, total: subtotal - discountCents };
}

function petTotal(petId: string) {
  return computeTotal(
    availableServicesForPet(petId),
    petBaseServices.value[petId] ?? [],
    petAddons.value[petId] ?? [],
    petBundles.value[petId]?.discountCents ?? 0,
  );
}

function guestTotal() {
  return computeTotal(
    availableServicesForGuest(),
    guestBaseServices.value,
    guestAddons.value,
    guestBundle.value?.discountCents ?? 0,
  );
}

/* ─────────────────────────────────── *
 * Availability + slot selection
 * ─────────────────────────────────── */
async function fetchAvailabilityPet(petId: string) {
  const date = petDates.value[petId];
  if (!date) return;

  const baseIds = petBaseServices.value[petId] ?? [];
  const addonIds = petAddons.value[petId] ?? [];
  if (!baseIds.length) return;

  const allServices = availableServicesForPet(petId);
  const totalDuration = [...baseIds, ...addonIds].reduce((sum, svcId) => {
    const svc = allServices.find((s) => s.id === svcId);
    return sum + (svc?.pricing.durationMinutes ?? 0);
  }, 0);

  if (totalDuration <= 0) return;

  const { slots } = await $fetch('/api/availability', {
    params: {
      date: calendarDateToString(date),
      duration: totalDuration,
      serviceIds: [...baseIds, ...addonIds].join(','),
    },
  });

  petAvailability.value[petId] = slots;
  delete petSlots.value[petId];
}

async function fetchAvailabilityGuest() {
  if (!guestDate.value) return;
  if (!guestBaseServices.value.length) return;

  const allServices = availableServicesForGuest();
  const allIds = [...guestBaseServices.value, ...guestAddons.value];
  const totalDuration = allIds.reduce((sum, svcId) => {
    const svc = allServices.find((s) => s.id === svcId);
    return sum + (svc?.pricing.durationMinutes ?? 0);
  }, 0);

  if (totalDuration <= 0) return;

  const { slots } = await $fetch('/api/availability', {
    params: {
      date: calendarDateToString(guestDate.value),
      duration: totalDuration,
      serviceIds: allIds.join(','),
    },
  });

  guestAvailability.value = slots;
  guestSlot.value = null;
}

function selectSlotPet(petId: string, groomerId: string, startTime: string, scheduledDate: string) {
  petSlots.value[petId] = { scheduledDate, groomerId, startTime };
}

function selectSlotGuest(groomerId: string, startTime: string, scheduledDate: string) {
  guestSlot.value = { scheduledDate, groomerId, startTime };
}

/* ─────────────────────────────────── *
 * Submit
 * ─────────────────────────────────── */
const submitting = ref(false);
const toast = useToast();

async function submitBooking() {
  submitting.value = true;

  try {
    if (isLoggedIn.value) {
      // Auth'd booking
      const body = {
        pets: selectedPetIds.value.map((petId) => ({
          petId,
          serviceIds: petBaseServices.value[petId] ?? [],
          addonIds: petAddons.value[petId] ?? [],
          bundleId: petBundles.value[petId]?.bundleId,
          discountAppliedCents: petBundles.value[petId]?.discountCents,
          ...petSlots.value[petId],
        })),
        notes: notes.value || undefined,
      };

      await $fetch('/api/appointments', { method: 'POST', body });
      navigateTo('/me/appointments');
    } else {
      // Guest booking
      const body = {
        pet: {
          name: guestPet.value.name,
          breed: guestPet.value.breed || undefined,
          weightLbs: guestPet.value.weightLbs,
          serviceIds: guestBaseServices.value,
          addonIds: guestAddons.value,
          bundleId: guestBundle.value?.bundleId,
          discountAppliedCents: guestBundle.value?.discountCents,
          ...guestSlot.value,
        },
        guestDetails: {
          firstName: guestContact.value.firstName,
          lastName: guestContact.value.lastName,
          email: guestContact.value.email,
          phone: guestContact.value.phone,
          emergencyContactName: guestContact.value.emergencyContactName || undefined,
          emergencyContactPhone: guestContact.value.emergencyContactPhone || undefined,
        },
        notes: notes.value || undefined,
      };

      const { appointmentId } = await $fetch('/api/appointments/guest', {
        method: 'POST',
        body,
      });

      navigateTo(`/book/confirmation?id=${appointmentId}`);
    }
  } catch (err: any) {
    toast.add({
      title: 'Booking failed',
      description: err?.data?.message ?? 'Something went wrong. Please try again.',
      color: 'error',
    });
  } finally {
    submitting.value = false;
  }
}

/* ─────────────────────────────────── *
 * Helpers
 * ─────────────────────────────────── */
function getPetName(petId: string) {
  return petData.value?.pets.find((p) => p.id === petId)?.name ?? '';
}
</script>

<template>
  <div>
    <AppPageHeader
      title="Book an Appointment"
      :description="
        isLoggedIn
          ? 'Book a grooming session for your pets'
          : 'Book a grooming session — no account needed'
      " />

    <UStepper
      disabled
      v-model="step"
      :items="stepperItems"
      class="mb-12 mt-6" />

    <!-- Step 0: Pets -->
    <div v-if="step === 0">
      <!-- Auth'd: select registered pets -->
      <template v-if="isLoggedIn">
        <PetsList
          :pets="petData?.pets"
          selectable
          v-model:selected="selectedPetIds" />
      </template>

      <!-- Guest: enter pet info -->
      <template v-else>
        <AppCard title="Your Pet's Info">
          <div class="space-y-4">
            <UFormField
              label="Pet Name"
              required>
              <UInput
                v-model="guestPet.name"
                placeholder="e.g. Buddy" />
            </UFormField>

            <UFormField label="Breed">
              <UInput
                v-model="guestPet.breed"
                placeholder="e.g. Golden Retriever" />
            </UFormField>

            <UFormField
              label="Weight (lbs)"
              hint="Needed for accurate pricing">
              <UInput
                v-model.number="guestPet.weightLbs"
                type="number"
                placeholder="e.g. 45"
                :min="1"
                :max="300" />
            </UFormField>

            <p
              v-if="guestPet.weightLbs && !guestSizeCategoryId"
              class="text-sm text-warning">
              No size category matches this weight. Please check the value.
            </p>
          </div>
        </AppCard>
      </template>
    </div>

    <!-- Step 1: Services -->
    <div v-if="step === 1">
      <!-- Auth'd: per-pet services -->
      <template v-if="isLoggedIn">
        <div
          v-for="petId in selectedPetIds"
          :key="petId"
          class="mb-10">
          <h3 class="text-lg font-semibold mb-4">{{ getPetName(petId) }}</h3>

          <!-- Bundles -->
          <div
            v-if="availableBundlesForPet(petId).length"
            class="mb-6">
            <h4 class="text-sm font-medium text-muted mb-2">Bundles</h4>
            <UPageGrid>
              <UPageCard
                v-for="bundle in availableBundlesForPet(petId)"
                :key="bundle.id"
                variant="subtle"
                :class="{ 'ring-2 ring-success-400': petBundles[petId]?.bundleId === bundle.id }"
                @click="toggleBundlePet(petId, bundle.id)">
                <template #body>
                  <div class="space-y-1">
                    <p class="font-medium">{{ bundle.name }}</p>
                    <p
                      v-if="bundle.description"
                      class="text-sm text-muted">
                      {{ bundle.description }}
                    </p>
                    <UBadge color="success">
                      {{
                        bundle.discountType === 'percent'
                          ? `${bundle.discountValue}% off`
                          : `$${formatCents(bundle.discountValue)} off`
                      }}
                    </UBadge>
                  </div>
                </template>
              </UPageCard>
            </UPageGrid>
          </div>

          <!-- Base Services -->
          <div class="mb-6">
            <h4 class="text-sm font-medium text-muted mb-2">Services</h4>
            <ServicesGrid
              :services="baseServicesForPet(petId)"
              v-model:selected="petBaseServices[petId]"
              @update:selected="autoDetectBundlePet(petId)" />
          </div>

          <!-- Addons -->
          <div
            v-if="compatibleAddonsForPet(petId).length"
            class="mb-6">
            <h4 class="text-sm font-medium text-muted mb-2">Addons</h4>
            <ServicesGrid
              :services="compatibleAddonsForPet(petId)"
              v-model:selected="petAddons[petId]"
              @update:selected="autoDetectBundlePet(petId)" />
          </div>

          <!-- Total -->
          <AppCard v-if="(petBaseServices[petId] ?? []).length > 0">
            <div class="p-4 space-y-1 text-sm">
              <div
                v-for="item in petTotal(petId).baseItems"
                :key="item.name"
                class="flex justify-between">
                <span>{{ item.name }}</span>
                <span>${{ formatCents(item.priceCents) }}</span>
              </div>
              <div
                v-for="item in petTotal(petId).addonItems"
                :key="item.name"
                class="flex justify-between text-muted">
                <span>{{ item.name }}</span>
                <span>${{ formatCents(item.priceCents) }}</span>
              </div>
              <div
                v-if="petTotal(petId).discountCents > 0"
                class="flex justify-between text-success">
                <span>Bundle discount</span>
                <span>-${{ formatCents(petTotal(petId).discountCents) }}</span>
              </div>
              <hr class="my-2 border-default" />
              <div class="flex justify-between font-semibold">
                <span>Total</span>
                <span>${{ formatCents(petTotal(petId).total) }}</span>
              </div>
            </div>
          </AppCard>
        </div>
      </template>

      <!-- Guest: single-pet services -->
      <template v-else>
        <div
          v-if="!guestSizeCategoryId"
          class="text-center py-8">
          <p class="text-muted">
            Please go back and enter your pet's weight to see available services and pricing.
          </p>
        </div>

        <div v-else>
          <!-- Bundles -->
          <div
            v-if="availableBundlesForGuest().length"
            class="mb-6">
            <h4 class="text-sm font-medium text-muted mb-2">Bundles</h4>
            <UPageGrid>
              <UPageCard
                v-for="bundle in availableBundlesForGuest()"
                :key="bundle.id"
                variant="subtle"
                :class="{ 'ring-2 ring-success-400': guestBundle?.bundleId === bundle.id }"
                @click="toggleBundleGuest(bundle.id)">
                <template #body>
                  <div class="space-y-1">
                    <p class="font-medium">{{ bundle.name }}</p>
                    <p
                      v-if="bundle.description"
                      class="text-sm text-muted">
                      {{ bundle.description }}
                    </p>
                    <UBadge color="success">
                      {{
                        bundle.discountType === 'percent'
                          ? `${bundle.discountValue}% off`
                          : `$${formatCents(bundle.discountValue)} off`
                      }}
                    </UBadge>
                  </div>
                </template>
              </UPageCard>
            </UPageGrid>
          </div>

          <!-- Base Services -->
          <div class="mb-6">
            <h4 class="text-sm font-medium text-muted mb-2">Services</h4>
            <ServicesGrid
              :services="baseServicesForGuest()"
              v-model:selected="guestBaseServices"
              @update:selected="autoDetectBundleGuest()" />
          </div>

          <!-- Addons -->
          <div
            v-if="compatibleAddonsForGuest().length"
            class="mb-6">
            <h4 class="text-sm font-medium text-muted mb-2">Addons</h4>
            <ServicesGrid
              :services="compatibleAddonsForGuest()"
              v-model:selected="guestAddons"
              @update:selected="autoDetectBundleGuest()" />
          </div>

          <!-- Total -->
          <AppCard v-if="guestBaseServices.length > 0">
            <div class="p-4 space-y-1 text-sm">
              <div
                v-for="item in guestTotal().baseItems"
                :key="item.name"
                class="flex justify-between">
                <span>{{ item.name }}</span>
                <span>${{ formatCents(item.priceCents) }}</span>
              </div>
              <div
                v-for="item in guestTotal().addonItems"
                :key="item.name"
                class="flex justify-between text-muted">
                <span>{{ item.name }}</span>
                <span>${{ formatCents(item.priceCents) }}</span>
              </div>
              <div
                v-if="guestTotal().discountCents > 0"
                class="flex justify-between text-success">
                <span>Bundle discount</span>
                <span>-${{ formatCents(guestTotal().discountCents) }}</span>
              </div>
              <hr class="my-2 border-default" />
              <div class="flex justify-between font-semibold">
                <span>Total</span>
                <span>${{ formatCents(guestTotal().total) }}</span>
              </div>
            </div>
          </AppCard>
        </div>
      </template>
    </div>

    <!-- Step 2: Schedule -->
    <div v-if="step === 2">
      <!-- Auth'd: per-pet scheduling -->
      <template v-if="isLoggedIn">
        <div
          v-for="petId in selectedPetIds"
          :key="petId"
          class="space-y-4 mb-8">
          <h3 class="font-semibold">{{ getPetName(petId) }}</h3>

          <AppDatePicker
            v-model="petDates[petId]"
            @update:model-value="fetchAvailabilityPet(petId)" />

          <div v-if="petAvailability[petId]?.length">
            <div
              v-for="groomer in petAvailability[petId]"
              :key="groomer.groomerId"
              class="mb-4">
              <p class="text-sm font-medium mb-2">{{ groomer.groomerName || 'Groomer' }}</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="slot in groomer.slots"
                  :key="slot.startTime"
                  size="sm"
                  :variant="
                    petSlots[petId]?.groomerId === groomer.groomerId &&
                    petSlots[petId]?.startTime === slot.startTime
                      ? 'solid'
                      : 'outline'
                  "
                  :label="slot.startTime"
                  @click="
                    selectSlotPet(
                      petId,
                      groomer.groomerId,
                      slot.startTime,
                      calendarDateToString(petDates[petId]!),
                    )
                  " />
              </div>
            </div>
          </div>

          <p
            v-else-if="petDates[petId]"
            class="text-sm text-muted">
            No available slots for this date
          </p>
        </div>
      </template>

      <!-- Guest: single-pet scheduling -->
      <template v-else>
        <div class="space-y-4">
          <h3 class="font-semibold">{{ guestPet.name }}</h3>

          <AppDatePicker
            v-model="guestDate"
            @update:model-value="fetchAvailabilityGuest()" />

          <div v-if="guestAvailability.length">
            <div
              v-for="groomer in guestAvailability"
              :key="groomer.groomerId"
              class="mb-4">
              <p class="text-sm font-medium mb-2">{{ groomer.groomerName || 'Groomer' }}</p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="slot in groomer.slots"
                  :key="slot.startTime"
                  size="sm"
                  :variant="
                    guestSlot?.groomerId === groomer.groomerId &&
                    guestSlot?.startTime === slot.startTime
                      ? 'solid'
                      : 'outline'
                  "
                  :label="slot.startTime"
                  @click="
                    selectSlotGuest(
                      groomer.groomerId,
                      slot.startTime,
                      calendarDateToString(guestDate!),
                    )
                  " />
              </div>
            </div>
          </div>

          <p
            v-else-if="guestDate"
            class="text-sm text-muted">
            No available slots for this date
          </p>
        </div>
      </template>

      <!-- Notes (shared) -->
      <UTextarea
        v-model="notes"
        placeholder="Any special notes or requests..."
        class="mt-4" />
    </div>

    <!-- Step 3: Finalize -->
    <div v-if="step === 3">
      <!-- Auth'd: review & submit -->
      <template v-if="isLoggedIn">
        <div
          v-for="petId in selectedPetIds"
          :key="petId"
          class="mb-8">
          <h4 class="font-semibold mb-3">{{ getPetName(petId) }}</h4>

          <AppCard>
            <div>
              <p class="font-medium mb-1">Services</p>
              <div
                v-for="item in petTotal(petId).baseItems"
                :key="item.name"
                class="flex justify-between">
                <span>{{ item.name }}</span>
                <span>${{ formatCents(item.priceCents) }}</span>
              </div>
            </div>

            <div v-if="petTotal(petId).addonItems.length">
              <p class="font-medium mb-1">Add-ons</p>
              <div
                v-for="item in petTotal(petId).addonItems"
                :key="item.name"
                class="flex justify-between">
                <span>{{ item.name }}</span>
                <span>${{ formatCents(item.priceCents) }}</span>
              </div>
            </div>

            <div
              v-if="petTotal(petId).discountCents > 0"
              class="flex justify-between text-success">
              <span>Bundle discount</span>
              <span>-${{ formatCents(petTotal(petId).discountCents) }}</span>
            </div>

            <hr class="border-default" />

            <div
              v-if="petSlots[petId]"
              class="flex justify-between">
              <span>{{ petSlots[petId].scheduledDate }} at {{ petSlots[petId].startTime }}</span>
            </div>

            <div class="flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>${{ formatCents(petTotal(petId).total) }}</span>
            </div>
          </AppCard>
        </div>

        <div
          v-if="notes"
          class="mb-6">
          <p class="text-sm font-medium mb-1">Notes</p>
          <p class="text-sm text-muted">{{ notes }}</p>
        </div>

        <div class="flex justify-between text-lg font-bold px-1">
          <span>Grand Total</span>
          <span>
            ${{
              formatCents(selectedPetIds.reduce((sum, petId) => sum + petTotal(petId).total, 0))
            }}
          </span>
        </div>
      </template>

      <!-- Guest: contact details + review -->
      <template v-else>
        <!-- Contact form -->
        <AppCard
          title="Your Contact Details"
          class="mb-8">
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField
                label="First Name"
                required>
                <UInput
                  v-model="guestContact.firstName"
                  placeholder="First name" />
              </UFormField>
              <UFormField
                label="Last Name"
                required>
                <UInput
                  v-model="guestContact.lastName"
                  placeholder="Last name" />
              </UFormField>
            </div>

            <UFormField
              label="Email"
              required>
              <UInput
                v-model="guestContact.email"
                type="email"
                placeholder="you@example.com" />
            </UFormField>

            <UFormField
              label="Phone"
              required>
              <UInput
                v-model="guestContact.phone"
                type="tel"
                placeholder="(555) 123-4567" />
            </UFormField>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Emergency Contact Name">
                <UInput
                  v-model="guestContact.emergencyContactName"
                  placeholder="Optional" />
              </UFormField>
              <UFormField label="Emergency Contact Phone">
                <UInput
                  v-model="guestContact.emergencyContactPhone"
                  type="tel"
                  placeholder="Optional" />
              </UFormField>
            </div>
          </div>
        </AppCard>

        <!-- Booking summary -->
        <h4 class="font-semibold mb-3">{{ guestPet.name }}</h4>
        <AppCard>
          <div>
            <p class="font-medium mb-1">Services</p>
            <div
              v-for="item in guestTotal().baseItems"
              :key="item.name"
              class="flex justify-between">
              <span>{{ item.name }}</span>
              <span>${{ formatCents(item.priceCents) }}</span>
            </div>
          </div>

          <div v-if="guestTotal().addonItems.length">
            <p class="font-medium mb-1">Add-ons</p>
            <div
              v-for="item in guestTotal().addonItems"
              :key="item.name"
              class="flex justify-between">
              <span>{{ item.name }}</span>
              <span>${{ formatCents(item.priceCents) }}</span>
            </div>
          </div>

          <div
            v-if="guestTotal().discountCents > 0"
            class="flex justify-between text-success">
            <span>Bundle discount</span>
            <span>-${{ formatCents(guestTotal().discountCents) }}</span>
          </div>

          <hr class="border-default" />

          <div
            v-if="guestSlot"
            class="flex justify-between">
            <span>{{ guestSlot.scheduledDate }} at {{ guestSlot.startTime }}</span>
          </div>

          <div class="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>${{ formatCents(guestTotal().total) }}</span>
          </div>
        </AppCard>

        <div
          v-if="notes"
          class="mt-4">
          <p class="text-sm font-medium mb-1">Notes</p>
          <p class="text-sm text-muted">{{ notes }}</p>
        </div>
      </template>
    </div>

    <!-- Navigation buttons -->
    <div class="flex justify-end gap-2 mt-6">
      <UButton
        v-if="canPrevStep"
        variant="ghost"
        size="xl"
        label="Back"
        @click="prevStep()" />
      <UButton
        v-if="step === stepperItems.length - 1"
        :disabled="!canNextStep || submitting"
        :loading="submitting"
        size="xl"
        label="Submit Booking"
        icon="i-lucide-check"
        @click="submitBooking()" />
      <UButton
        v-else
        :disabled="!canNextStep"
        size="xl"
        label="Continue"
        trailing-icon="i-lucide-arrow-right"
        @click="nextStep()" />
    </div>
  </div>
</template>
