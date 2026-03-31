<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date';
import type { StepperItem } from '@nuxt/ui';

definePageMeta({
  layout: 'customer',
  middleware: 'auth',
});

/* ─────────────────────────────────── *
 *  Stepper
 * ─────────────────────────────────── */
const step = ref(0);

const stepperItems: StepperItem[] = [
  {
    title: 'Pets',
    description: 'Select pets',
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
      additionalCheck = selectedPetIds.value.length > 0;
      break;
    case 1:
      additionalCheck = selectedPetIds.value.every(
        (id) => (petBaseServices.value[id] ?? []).length > 0,
      );
      break;
    case 2:
      additionalCheck = selectedPetIds.value.every((id) => petSlots.value[id]);
      break;
    case 3:
      return true;
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
 *  Step 1: Select pets
 * ─────────────────────────────────── */
const { data: petData } = await useFetch('/api/pets');
const selectedPetIds = ref<string[]>([]);

/* ─────────────────────────────────── *
 *  Step 2: Select services and dates
 * ─────────────────────────────────── */
const { data: serviceData } = await useFetch('/api/services');
const { data: bundleData } = await useFetch('/api/bundles');
const { data: addonMapData } = await useFetch('/api/services/addon-map');

const petBaseServices = ref<Record<string, number[]>>({});
const petAddons = ref<Record<string, number[]>>({});
const petBundles = ref<Record<string, { bundleId: number; discountCents: number } | null>>({});

const petSlots = ref<
  Record<
    string,
    {
      scheduledDate: string;
      groomerId: string;
      startTime: string;
    }
  >
>({});

/* ─────────────────────────────────── *
 *  Step 3: Review + Submit
 * ─────────────────────────────────── */
const notes = ref('');

// Track selected date per pet
const petDates = ref<Record<string, CalendarDate | undefined>>({});

// Track fetched availability per pet
const petAvailability = ref<Record<string, any[]>>({});

async function fetchAvailability(petId: string) {
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

function selectSlot(petId: string, groomerId: string, startTime: string, scheduledDate: string) {
  petSlots.value[petId] = { scheduledDate, groomerId, startTime };
}

async function submitBooking() {
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
  navigateTo('/home');
}

/* ─────────────────────────────────── *
 *  Helpers
 * ─────────────────────────────────── */
function getPetName(petId: string) {
  return petData.value?.pets.find((p) => p.id === petId)?.name ?? '';
}

function baseServicesForPet(petId: string) {
  return availableServicesForPet(petId).filter((s) => !s.isAddon);
}

// Retuns services where pet has valid pricing
function availableServicesForPet(petId: string) {
  const pet = petData.value?.pets.find((p) => p.id === petId);
  if (!pet?.sizeCategoryId) return [];

  return (serviceData.value?.services ?? [])
    .map((s) => {
      const pricing = s.pricing.find((p) => p.sizeCategoryId === pet.sizeCategoryId);
      if (!pricing) return null;

      return { ...s, pricing };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// Returns bundles where pet has valid pricing for every included service
function availableBundlesForPet(petId: string) {
  const petServices = availableServicesForPet(petId);
  const petServiceIds = new Set(petServices.map((s) => s.id));

  return (bundleData.value?.bundles ?? []).filter((bundle) =>
    bundle.serviceIds.every((id) => petServiceIds.has(id)),
  );
}

// Returns addon services compatible with any of the pets selected base services
function compatibleAddonsForPet(petId: string) {
  const baseIds = petBaseServices.value[petId] ?? [];
  if (!baseIds.length) return [];

  const addonMap = addonMapData.value?.addonMap ?? {};
  const compatibleAddonIds = new Set(baseIds.flatMap((id) => addonMap[id] ?? []));

  return availableServicesForPet(petId).filter((s) => s.isAddon && compatibleAddonIds.has(s.id));
}

function toggleBundle(petId: string, bundleId: number) {
  const current = petBundles.value[petId];

  // deselect if same bundle clicked again
  if (current?.bundleId === bundleId) {
    petBundles.value[petId] = null;

    // remove bundle's services from selections
    const bundle = (bundleData.value?.bundles ?? []).find((b) => b.id === bundleId);

    if (bundle) {
      const allServices = availableServicesForPet(petId);
      const bundleBaseIds = bundle.serviceIds.filter((id) => {
        const svc = allServices.find((s) => s.id === id);
        return svc && !svc.isAddon;
      });

      const bundleAddonIds = bundle.serviceIds.filter((id) => {
        const svc = allServices.find((s) => s.id === id);
        return svc?.isAddon;
      });

      petBaseServices.value[petId] = (petBaseServices.value[petId] ?? []).filter(
        (id) => !bundleBaseIds.includes(id),
      );

      petAddons.value[petId] = (petAddons.value[petId] ?? []).filter(
        (id) => !bundleAddonIds.includes(id),
      );
    }

    return;
  }

  // select bundle and add services
  const bundle = (bundleData.value?.bundles ?? []).find((b) => b.id === bundleId);
  if (!bundle) return;

  const allServices = availableServicesForPet(petId);
  const bundleBaseIds = bundle.serviceIds.filter((id) => {
    const svc = allServices.find((s) => s.id === id);
    return svc && !svc.isAddon;
  });

  const bundleAddonIds = bundle.serviceIds.filter((id) => {
    const svc = allServices.find((s) => s.id === id);
    return svc?.isAddon;
  });

  // merge with existing selections
  // we dont want to remove manually selected services
  petBaseServices.value[petId] = [
    ...new Set([...(petBaseServices.value[petId] ?? []), ...bundleBaseIds]),
  ];

  petAddons.value[petId] = [...new Set([...(petAddons.value[petId] ?? []), ...bundleAddonIds])];

  // compute discount
  const discountCents = computeBundleDiscount(petId, bundle);
  petBundles.value[petId] = { bundleId, discountCents };
}

// After any service selection change, check if a bundle should auto apply
function autoDetectBundle(petId: string) {
  const baseIds = petBaseServices.value[petId] ?? [];
  const addonIds = petAddons.value[petId] ?? [];
  const allSelectedIds = new Set([...baseIds, ...addonIds]);

  const available = availableBundlesForPet(petId);
  let bestBundle: (typeof available)[0] | null = null;
  let bestDiscount = 0;

  for (const bundle of available) {
    const isMatch = bundle.serviceIds.every((id) => allSelectedIds.has(id));
    if (!isMatch) continue;

    const discount = computeBundleDiscount(petId, bundle);
    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestBundle = bundle;
    }
  }

  if (bestBundle)
    petBundles.value[petId] = { bundleId: bestBundle.id, discountCents: bestDiscount };
  else petBundles.value[petId] = null;
}

function computeBundleDiscount(
  petId: string,
  bundle: { discountType: string; discountValue: number; serviceIds: number[] },
) {
  const allServices = availableServicesForPet(petId);
  const bundleTotal = bundle.serviceIds.reduce((sum, id) => {
    const svc = allServices.find((s) => s.id === id);
    return sum + (svc?.pricing.priceCents ?? 0);
  }, 0);

  if (bundle.discountType === 'percent') {
    return Math.round(bundleTotal * (bundle.discountValue / 100));
  }

  return bundle.discountValue;
}

function petTotal(petId: string) {
  const allServices = availableServicesForPet(petId);
  const baseIds = petBaseServices.value[petId] ?? [];
  const addonIds = petAddons.value[petId] ?? [];

  const baseItems = baseIds.map((id) => {
    const svc = allServices.find((s) => s.id === id);
    return { name: svc?.name ?? '', priceCents: svc?.pricing.priceCents ?? 0 };
  });

  const addonItems = addonIds.map((id) => {
    const svc = allServices.find((s) => s.id === id);
    return { name: svc?.name ?? '', priceCents: svc?.pricing.priceCents ?? 0 };
  });

  const subtotal = [...baseItems, ...addonItems].reduce((sum, item) => sum + item.priceCents, 0);
  const discountCents = petBundles.value[petId]?.discountCents ?? 0;
  const total = subtotal - discountCents;

  return {
    baseItems,
    addonItems,
    discountCents,
    subtotal,
    total,
  };
}
</script>

<template>
  <div>
    <UStepper
      disabled
      v-model="step"
      :items="stepperItems"
      class="mb-12" />

    <!-- Step 1: Select pets -->
    <div v-if="step === 0">
      <PetsList
        :pets="petData?.pets"
        selectable
        v-model:selected="selectedPetIds" />
    </div>

    <!-- Step 2: Bundles, Services, Addons -->
    <div v-if="step === 1">
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
              :class="{
                'ring-2 ring-success-400': petBundles[petId]?.bundleId === bundle.id,
              }"
              @click="toggleBundle(petId, bundle.id)">
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
                        : `$${(bundle.discountValue / 100).toFixed(2)} off`
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
            @update:selected="autoDetectBundle(petId)" />
        </div>

        <!-- Compatible Addons -->
        <div
          v-if="compatibleAddonsForPet(petId).length"
          class="mb-6">
          <h4 class="text-sm font-medium text-muted mb-2">Addons</h4>
          <ServicesGrid
            :services="compatibleAddonsForPet(petId)"
            v-model:selected="petAddons[petId]"
            @update:selected="autoDetectBundle(petId)" />
        </div>

        <!-- Total -->
        <AppCard v-if="(petBaseServices[petId] ?? []).length > 0">
          <div class="p-4 space-y-1 text-sm">
            <!-- base services -->
            <div
              v-for="item in petTotal(petId).baseItems"
              :key="item.name"
              class="flex justify-between">
              <span>{{ item.name }}</span>
              <span>${{ (item.priceCents / 100).toFixed(2) }}</span>
            </div>

            <!-- addons -->
            <div
              v-for="item in petTotal(petId).addonItems"
              :key="item.name"
              class="flex justify-between text-muted">
              <span>{{ item.name }}</span>
              <span>${{ (item.priceCents / 100).toFixed(2) }}</span>
            </div>

            <!-- discount -->
            <div
              v-if="petTotal(petId).discountCents > 0"
              class="flex justify-between text-success">
              <span>Bundle discount</span>
              <span>-${{ (petTotal(petId).discountCents / 100).toFixed(2) }}</span>
            </div>

            <!-- grand total -->
            <hr class="my-2 border-default" />
            <div class="flex justify-between font-semibold">
              <span>Total</span>
              <span>${{ (petTotal(petId).total / 100).toFixed(2) }}</span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Step 3: Schedule -->
    <div v-if="step === 2">
      <div
        v-for="petId in selectedPetIds"
        :key="petId"
        class="space-y-4 mb-8">
        <h3 class="font-semibold">{{ getPetName(petId) }}</h3>

        <!-- Date picker -->
        <AppDatePicker
          v-model="petDates[petId]"
          @update:model-value="fetchAvailability(petId)" />

        <!-- Available slots -->
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
                  selectSlot(
                    petId,
                    groomer.groomerId,
                    slot.startTime,
                    calendarDateToString(petDates[petId]!),
                  )
                " />
            </div>
          </div>
        </div>

        <!-- No slots available -->
        <p
          v-else-if="petDates[petId]"
          class="text-sm text-muted">
          No available slots for this date
        </p>
      </div>

      <!-- Notes -->
      <UTextarea
        v-model="notes"
        placeholder="Any special notes or requests..."
        class="mt-4" />
    </div>

    <!-- Step 4: Review -->
    <div v-if="step === 3">
      <div
        v-for="petId in selectedPetIds"
        :key="petId"
        class="mb-8">
        <h4 class="font-semibold mb-3">{{ getPetName(petId) }}</h4>

        <AppCard>
          <!-- services -->
          <div>
            <p class="font-medium mb-1">Services</p>
            <div
              v-for="item in petTotal(petId).baseItems"
              :key="item.name"
              class="flex justify-between">
              <span>{{ item.name }}</span>
              <span>${{ (item.priceCents / 100).toFixed(2) }}</span>
            </div>
          </div>

          <!-- addons -->
          <div v-if="petTotal(petId).addonItems.length">
            <p class="font-medium mb-1">Add-ons</p>
            <div
              v-for="item in petTotal(petId).addonItems"
              :key="item.name"
              class="flex justify-between">
              <span>{{ item.name }}</span>
              <span>${{ (item.priceCents / 100).toFixed(2) }}</span>
            </div>
          </div>

          <!-- bundle -->
          <div
            v-if="petTotal(petId).discountCents > 0"
            class="flex justify-between text-success">
            <span>Bundle discount</span>
            <span>-${{ (petTotal(petId).discountCents / 100).toFixed(2) }}</span>
          </div>

          <hr class="border-default" />

          <!-- schedule -->
          <div
            v-if="petSlots[petId]"
            class="flex justify-between">
            <span>{{ petSlots[petId].scheduledDate }} at {{ petSlots[petId].startTime }}</span>
          </div>

          <!-- total -->
          <div class="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>${{ (petTotal(petId).total / 100).toFixed(2) }}</span>
          </div>
        </AppCard>
      </div>

      <!-- notes -->
      <div
        v-if="notes"
        class="mb-6">
        <p class="text-sm font-medium mb-1">Notes</p>
        <p class="text-sm text-muted">{{ notes }}</p>
      </div>

      <!-- grand total -->
      <div class="flex justify-between text-lg font-bold px-1">
        <span>Grand Total</span>
        <span>
          ${{
            (selectedPetIds.reduce((sum, petId) => sum + petTotal(petId).total, 0) / 100).toFixed(2)
          }}
        </span>
      </div>
    </div>

    <div class="flex justify-end gap-2 mt-6">
      <UButton
        v-if="canPrevStep"
        variant="ghost"
        size="xl"
        label="Back"
        @click="prevStep()" />
      <UButton
        v-if="step === stepperItems.length - 1"
        :disabled="!canNextStep"
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
