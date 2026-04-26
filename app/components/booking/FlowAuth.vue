<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date';

const props = defineProps<{
  step: number;
  serviceData: any;
  bundleData: any;
  addonMapData: any;
  sizeCategoryData: any;
  petData: any;
  minBookingDate: CalendarDate;
  notes: string;
}>();

const toast = useToast();

/* ─────────────────────────────────── *
 * Pet selection + per pet state
 * ─────────────────────────────────── */
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
 * Payment method
 * ─────────────────────────────────── */
const selectedPaymentMethodId = ref<string | null>(null);
const showNewCardForm = ref(false);
const newCardClientSecret = ref('');
const newCardComplete = ref(false);
const loadingCardSetup = ref(false);
const saveNewCard = ref(true);
const cardFormRef = ref<{ confirm: () => Promise<string> } | null>(null);

const { data: pmData } = await useFetch<{ paymentMethods: any[] }>('/api/payment-methods', {
  key: `payment-methods-${Date.now()}`,
});
const savedCards = computed(() => pmData.value?.paymentMethods ?? []);

watch(
  savedCards,
  (cards) => {
    if (!selectedPaymentMethodId.value && cards.length > 0) {
      const defaultCard = cards.find((c: any) => c.isDefault) ?? cards[0];
      selectedPaymentMethodId.value = defaultCard.stripePaymentMethodId;
    }
  },
  { immediate: true },
);

async function startNewCard() {
  showNewCardForm.value = true;
  if (newCardClientSecret.value) return;

  loadingCardSetup.value = true;
  try {
    const res = await $fetch<{ clientSecret: string }>('/api/payment-methods/setup-intent', {
      method: 'POST',
    });
    newCardClientSecret.value = res.clientSecret;
  } catch {
    showNewCardForm.value = false;
    toast.add({ title: 'Failed to launch card setup', color: 'error' });
  } finally {
    loadingCardSetup.value = false;
  }
}

/* ─────────────────────────────────── *
 * Service / bundle / addon helpers
 * ─────────────────────────────────── */
function servicesForSizeCategory(sizeCategoryId: number | null) {
  if (!sizeCategoryId) return [];
  return (props.serviceData?.services ?? [])
    .map((s: any) => {
      const pricing = s.pricing.find((p: any) => p.sizeCategoryId === sizeCategoryId);
      if (!pricing) return null;
      return { ...s, pricing };
    })
    .filter((s: any): s is NonNullable<typeof s> => s !== null);
}

function availableServicesForPet(petId: string) {
  const pet = props.petData?.pets.find((p: any) => p.id === petId);
  if (!pet?.sizeCategoryId) return [];
  return servicesForSizeCategory(pet.sizeCategoryId);
}

function baseServicesForPet(petId: string) {
  return availableServicesForPet(petId).filter((s: any) => !s.isAddon);
}

function availableBundlesForPet(petId: string) {
  const petServices = availableServicesForPet(petId);
  const petServiceIds = new Set(petServices.map((s: any) => s.id));
  return (props.bundleData?.bundles ?? []).filter((bundle: any) =>
    bundle.serviceIds.every((id: number) => petServiceIds.has(id)),
  );
}

function compatibleAddonsForPet(petId: string) {
  const baseIds = petBaseServices.value[petId] ?? [];
  if (!baseIds.length) return [];
  const addonMap = props.addonMapData?.addonMap ?? {};
  const compatibleAddonIds = new Set(baseIds.flatMap((id) => addonMap[id] ?? []));
  return availableServicesForPet(petId).filter(
    (s: any) => s.isAddon && compatibleAddonIds.has(s.id),
  );
}

/* ─────────────────────────────────── *
 * Per-render context
 * ─────────────────────────────────── */
type PetView = {
  available: ReturnType<typeof availableServicesForPet>;
  base: ReturnType<typeof baseServicesForPet>;
  bundles: ReturnType<typeof availableBundlesForPet>;
  addons: ReturnType<typeof compatibleAddonsForPet>;
};

const petContext = computed<Record<string, PetView>>(() => {
  const ctx: Record<string, PetView> = {};
  for (const id of selectedPetIds.value) {
    ctx[id] = {
      available: availableServicesForPet(id),
      base: baseServicesForPet(id),
      bundles: availableBundlesForPet(id),
      addons: compatibleAddonsForPet(id),
    };
  }
  return ctx;
});

/* ─────────────────────────────────── *
 * Bundle partition + toggle
 * ─────────────────────────────────── */
function partitionBundleServices(
  allServices: ReturnType<typeof availableServicesForPet>,
  bundle: { serviceIds: number[] },
) {
  const svcMap = new Map(allServices.map((s: any) => [s.id, s]));
  const baseIds: number[] = [];
  const addonIds: number[] = [];
  for (const id of bundle.serviceIds) {
    const svc = svcMap.get(id);
    if (!svc) continue;
    ((svc as any).isAddon ? addonIds : baseIds).push(id);
  }
  return { baseIds, addonIds };
}

function computeBundleDiscount(
  allServices: ReturnType<typeof availableServicesForPet>,
  bundle: { discountType: string; discountValue: number; serviceIds: number[] },
) {
  const bundleTotal = bundle.serviceIds.reduce((sum, id) => {
    const svc = allServices.find((s: any) => s.id === id);
    return sum + (svc?.pricing.priceCents ?? 0);
  }, 0);

  return bundle.discountType === 'percent'
    ? Math.round(bundleTotal * (bundle.discountValue / 100))
    : bundle.discountValue;
}

function toggleBundlePet(petId: string, bundleId: number) {
  const current = petBundles.value[petId];
  const bundle = (props.bundleData?.bundles ?? []).find((b: any) => b.id === bundleId);
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
    if (!bundle.serviceIds.every((id: number) => allSelectedIds.has(id))) continue;
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
 * Pricing totals
 * ─────────────────────────────────── */
function computeTotal(
  allServices: ReturnType<typeof availableServicesForPet>,
  baseIds: number[],
  addonIds: number[],
  discountCents: number,
) {
  const baseItems = baseIds.map((id) => {
    const svc = allServices.find((s: any) => s.id === id);
    return { name: svc?.name ?? '', priceCents: svc?.pricing.priceCents ?? 0 };
  });
  const addonItems = addonIds.map((id) => {
    const svc = allServices.find((s: any) => s.id === id);
    return { name: svc?.name ?? '', priceCents: svc?.pricing.priceCents ?? 0 };
  });
  const subtotal = [...baseItems, ...addonItems].reduce((sum, item) => sum + item.priceCents, 0);
  return { baseItems, addonItems, discountCents, subtotal, total: subtotal - discountCents };
}

const petTotals = computed(() => {
  const m = new Map<string, ReturnType<typeof computeTotal>>();
  for (const id of selectedPetIds.value) {
    m.set(
      id,
      computeTotal(
        petContext.value[id]?.available ?? [],
        petBaseServices.value[id] ?? [],
        petAddons.value[id] ?? [],
        petBundles.value[id]?.discountCents ?? 0,
      ),
    );
  }
  return m;
});

/* ─────────────────────────────────── *
 * Availability + slot selection
 * ─────────────────────────────────── */
const { schedule, isCompleteCalendarDate } = useBookingAvailability();

function onPetDateChange(petId: string) {
  schedule(`pet:${petId}`, () => fetchAvailabilityPet(petId));
}

async function fetchAvailabilityPet(petId: string) {
  const date = petDates.value[petId];
  if (!isCompleteCalendarDate(date)) return;

  const baseIds = petBaseServices.value[petId] ?? [];
  const addonIds = petAddons.value[petId] ?? [];
  if (!baseIds.length) return;

  const allServices = availableServicesForPet(petId);
  const totalDuration = [...baseIds, ...addonIds].reduce((sum, svcId) => {
    const svc = allServices.find((s: any) => s.id === svcId);
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

function selectSlotPet(petId: string, groomerId: string, startTime: string, scheduledDate: string) {
  petSlots.value[petId] = { scheduledDate, groomerId, startTime };
}

/* ─────────────────────────────────── *
 * Helpers
 * ─────────────────────────────────── */
function getPetName(petId: string) {
  return props.petData?.pets.find((p: any) => p.id === petId)?.name ?? '';
}

/* ─────────────────────────────────── *
 * Shell contract
 * ─────────────────────────────────── */
function canAdvance(step: number): boolean {
  switch (step) {
    case 0:
      return selectedPetIds.value.length > 0;
    case 1:
      return selectedPetIds.value.every((id) => (petBaseServices.value[id] ?? []).length > 0);
    case 2:
      return selectedPetIds.value.every((id) => !!petSlots.value[id]);
    case 3:
      return showNewCardForm.value ? newCardComplete.value : !!selectedPaymentMethodId.value;
    default:
      return false;
  }
}

async function buildPayload() {
  let paymentMethodId = selectedPaymentMethodId.value || undefined;

  if (showNewCardForm.value) {
    if (!cardFormRef.value) return null;
    try {
      paymentMethodId = await cardFormRef.value.confirm();
    } catch {
      return null;
    }
    selectedPaymentMethodId.value = paymentMethodId;

    if (saveNewCard.value) {
      try {
        await $fetch('/api/payment-methods', {
          method: 'POST',
          body: { stripePaymentMethodId: paymentMethodId },
        });
      } catch {}
    }
  }

  return {
    endpoint: '/api/appointments' as const,
    body: {
      pets: selectedPetIds.value.map((petId) => ({
        petId,
        serviceIds: petBaseServices.value[petId] ?? [],
        addonIds: petAddons.value[petId] ?? [],
        bundleId: petBundles.value[petId]?.bundleId,
        discountAppliedCents: petBundles.value[petId]?.discountCents,
        ...petSlots.value[petId],
      })),
      paymentMethodId,
    },
    onSuccess: () => '/me/appointments',
  };
}

defineExpose({ canAdvance, buildPayload });
</script>

<template>
  <div>
    <!-- Step 0: Pet selection -->
    <div v-if="step === 0">
      <PetsList
        :pets="petData?.pets"
        selectable
        v-model:selected="selectedPetIds" />
    </div>

    <!-- Step 1: Services -->
    <div v-if="step === 1">
      <div
        v-for="petId in selectedPetIds"
        :key="petId"
        class="mb-10">
        <h3 class="text-lg font-semibold mb-4">{{ getPetName(petId) }}</h3>

        <div
          v-if="petContext[petId]?.bundles.length"
          class="mb-6">
          <h4 class="text-sm font-medium text-muted mb-2">Bundles</h4>
          <UPageGrid>
            <UPageCard
              v-for="bundle in petContext[petId]!.bundles"
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

        <div class="mb-6">
          <h4 class="text-sm font-medium text-muted mb-2">Services</h4>
          <ServicesGrid
            :services="petContext[petId]?.base ?? []"
            v-model:selected="petBaseServices[petId]"
            @update:selected="autoDetectBundlePet(petId)" />
        </div>

        <div
          v-if="petContext[petId]?.addons.length"
          class="mb-6">
          <h4 class="text-sm font-medium text-muted mb-2">Addons</h4>
          <ServicesGrid
            :services="petContext[petId]!.addons"
            v-model:selected="petAddons[petId]"
            @update:selected="autoDetectBundlePet(petId)" />
        </div>

        <AppCard v-if="(petBaseServices[petId] ?? []).length > 0">
          <div class="p-4 space-y-1 text-sm">
            <div
              v-for="item in petTotals.get(petId)?.baseItems"
              :key="item.name"
              class="flex justify-between">
              <span>{{ item.name }}</span>
              <span>${{ formatCents(item.priceCents) }}</span>
            </div>
            <div
              v-for="item in petTotals.get(petId)?.addonItems"
              :key="item.name"
              class="flex justify-between text-muted">
              <span>{{ item.name }}</span>
              <span>${{ formatCents(item.priceCents) }}</span>
            </div>
            <div
              v-if="(petTotals.get(petId)?.discountCents ?? 0) > 0"
              class="flex justify-between text-success">
              <span>Bundle discount</span>
              <span>-${{ formatCents(petTotals.get(petId)!.discountCents) }}</span>
            </div>
            <hr class="my-2 border-default" />
            <div class="flex justify-between font-semibold">
              <span>Total</span>
              <span>${{ formatCents(petTotals.get(petId)?.total ?? 0) }}</span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Step 2: Schedule -->
    <div v-if="step === 2">
      <div
        v-for="petId in selectedPetIds"
        :key="petId"
        class="space-y-4 mb-8">
        <h3 class="font-semibold">{{ getPetName(petId) }}</h3>
        <AppDatePicker
          v-model="petDates[petId]"
          :min-value="minBookingDate"
          @update:model-value="onPetDateChange(petId)" />
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
    </div>

    <!-- Step 3: Finalize -->
    <div
      v-if="step === 3"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Inputs: bottom on mobile, left on desktop -->
      <div class="lg:col-span-2 order-2 lg:order-1">
        <AppCard title="Payment">
          <div
            v-if="savedCards.length > 0"
            class="space-y-2 mb-4">
            <label
              v-for="card in savedCards"
              :key="card.id"
              class="flex items-center gap-3 p-3 rounded-lg border border-default cursor-pointer hover:bg-muted/50 transition"
              :class="{
                'ring-2 ring-primary': selectedPaymentMethodId === card.stripePaymentMethodId,
              }">
              <input
                type="radio"
                name="payment-method"
                :value="card.stripePaymentMethodId"
                v-model="selectedPaymentMethodId"
                class="accent-primary" />
              <span class="text-sm font-medium capitalize">{{ card.brand }}</span>
              <span class="text-sm text-muted">&bull;&bull;&bull;&bull; {{ card.last4 }}</span>
              <span class="text-sm text-muted">{{ card.expMonth }}/{{ card.expYear }}</span>
              <UBadge
                v-if="card.isDefault"
                label="Default"
                color="primary"
                variant="subtle"
                size="sm" />
            </label>
          </div>

          <div v-if="!showNewCardForm">
            <UButton
              :label="savedCards.length > 0 ? 'Use a different card' : 'Add a card'"
              icon="i-lucide-plus"
              variant="outline"
              @click="startNewCard" />
          </div>

          <div
            v-else
            class="mt-4">
            <PaymentCardForm
              v-if="newCardClientSecret"
              ref="cardFormRef"
              :client-secret="newCardClientSecret"
              @update:complete="newCardComplete = $event" />

            <p
              v-else-if="loadingCardSetup"
              class="text-sm text-muted">
              Setting up secure payment…
            </p>

            <USwitch
              v-model="saveNewCard"
              label="Save this card?"
              class="mt-4" />
          </div>
        </AppCard>
      </div>

      <!-- Summary: top on mobile, right on desktop -->
      <aside class="lg:col-span-1 order-1 lg:order-2">
        <div class="lg:sticky lg:top-6 space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <BookingPetSummaryCard
            v-for="petId in selectedPetIds"
            :key="petId"
            :pet-name="getPetName(petId)"
            :total="petTotals.get(petId)!"
            :slot="petSlots[petId]" />

          <div class="flex justify-between text-lg font-bold px-1">
            <span>Grand Total</span>
            <span>
              ${{
                formatCents(
                  selectedPetIds.reduce(
                    (sum, petId) => sum + (petTotals.get(petId)?.total ?? 0),
                    0,
                  ),
                )
              }}
            </span>
          </div>

          <div v-if="notes">
            <p class="text-sm font-medium mb-1">Notes</p>
            <p class="text-sm text-muted">{{ notes }}</p>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
