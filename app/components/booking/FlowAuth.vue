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

defineExpose({ canAdvance, buildPayload, nextStepHint });

const toast = useToast();

/* ─────────────────────────────────── *
 * Pet selection + per pet state
 * ─────────────────────────────────── */
const { selectedPetIds, petBaseServices, petAddons, petBundles, petSlots, petDates } =
  useBookingState();
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

  const previousId = petBundles.value[petId]?.bundleId ?? null;
  petBundles.value[petId] = bestBundle
    ? { bundleId: bestBundle.id, discountCents: bestDiscount }
    : null;

  if (bestBundle && bestBundle.id !== previousId) {
    toast.add({
      title: `${bestBundle.name} applied for ${getPetName(petId)}`,
      description: `You saved $${formatCents(bestDiscount)}.`,
      icon: 'i-lucide-sparkles',
      color: 'success',
    });
  }
}

function bundleDiscountForPet(petId: string, bundle: any) {
  return computeBundleDiscount(availableServicesForPet(petId), bundle);
}

function bestValueBundleForPet(petId: string): number | null {
  const bundles = availableBundlesForPet(petId);
  if (bundles.length < 2) return null;

  const allServices = availableServicesForPet(petId);
  let bestId: number | null = null;
  let bestDiscount = 0;

  for (const bundle of bundles) {
    const d = computeBundleDiscount(allServices, bundle);
    if (d > bestDiscount) {
      bestDiscount = d;
      bestId = bundle.id;
    }
  }

  return bestId;
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
  delete petSlots.value[petId];
  schedule(`pet:${petId}`, () => fetchAvailabilityPet(petId));
}

function durationForPet(petId: string) {
  const baseIds = petBaseServices.value[petId] ?? [];
  const addonIds = petAddons.value[petId] ?? [];
  const allServices = availableServicesForPet(petId);

  return [...baseIds, ...addonIds].reduce((sum, svcId) => {
    const svc = allServices.find((s: any) => s.id === svcId);
    return sum + (svc?.pricing.durationMinutes ?? 0);
  }, 0);
}

function selectedGroomerNameForPet(petId: string) {
  const slot = petSlots.value[petId];
  if (!slot) return '';

  const g = (petAvailability.value[petId] ?? []).find((g: any) => g.groomerId === slot.groomerId);

  return g?.groomerName ?? 'Groomer';
}

async function fetchAvailabilityPet(petId: string) {
  const date = petDates.value[petId];
  if (!isCompleteCalendarDate(date)) return;

  const baseIds = petBaseServices.value[petId] ?? [];
  const addonIds = petAddons.value[petId] ?? [];
  if (!baseIds.length) return;

  const totalDuration = durationForPet(petId);
  if (totalDuration <= 0) return;

  const { slots } = await $fetch('/api/availability', {
    params: {
      date: calendarDateToString(date),
      duration: totalDuration,
      serviceIds: [...baseIds, ...addonIds].join(','),
    },
  });

  petAvailability.value[petId] = slots;
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
 * Restore availability after reload
 * ─────────────────────────────────── */
onMounted(async () => {
  await nextTick(); // wait one tick for parent's hydration
  for (const petId of selectedPetIds.value) {
    if (petDates.value[petId] && (petBaseServices.value[petId] ?? []).length > 0) {
      fetchAvailabilityPet(petId);
    }
  }

  // skipp "Add a card" when theres nothing the switch from
  if (savedCards.value.length === 0) {
    startNewCard();
  }
});

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

function nextStepHint(step: number): string | null {
  switch (step) {
    case 0:
      return selectedPetIds.value.length > 0 ? null : 'Pick at least one pup to book.';
    case 1: {
      const missing = selectedPetIds.value.filter(
        (id) => (petBaseServices.value[id] ?? []).length === 0,
      );
      if (!missing.length) return null;
      const names = missing.map(getPetName).filter(Boolean).join(', ');
      return names
        ? `Pick at least one service for ${names}.`
        : 'Pick at least one service per pup.';
    }
    case 2: {
      const missing = selectedPetIds.value.filter((id) => !petSlots.value[id]);
      if (!missing.length) return null;
      const names = missing.map(getPetName).filter(Boolean).join(', ');
      return names ? `Pick a time slot for ${names}.` : 'Pick a time slot for each pup.';
    }
    case 3:
      if (showNewCardForm.value && !newCardComplete.value)
        return 'Finish entering your card details.';
      if (!selectedPaymentMethodId.value && !showNewCardForm.value)
        return 'Choose a payment method.';
      return null;
    default:
      return null;
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
</script>

<template>
  <div>
    <!-- Step 0: Pet selection -->
    <div v-if="step === 0">
      <PetsList
        :pets="petData?.pets"
        selectable
        show-add-new
        v-model:selected="selectedPetIds" />
    </div>

    <!-- Step 1: Services -->
    <div v-if="step === 1">
      <div
        v-for="petId in selectedPetIds"
        :key="petId"
        :class="['grid grid-cols-1 lg:grid-cols-3 gap-6', 'mb-10']">
        <div class="lg:col-span-2 space-y-6">
          <header class="flex items-center gap-3">
            <span
              class="inline-flex size-9 items-center justify-center rounded-full bg-primary-100/70 text-primary-600">
              <UIcon
                name="i-lucide-paw-print"
                class="size-5" />
            </span>

            <h3 class="text-xl font-semibold leading-none">{{ getPetName(petId) }}</h3>
          </header>

          <BookingSectionPanel
            v-if="petContext[petId]?.bundles.length"
            kicker="Save with a bundle"
            title="Bundles &amp; savings"
            description="Pre-picked combos with the lowest price per service."
            icon="i-lucide-sparkles">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BookingBundleCard
                v-for="bundle in petContext[petId]!.bundles"
                :key="bundle.id"
                :bundle="bundle"
                :services="petContext[petId]?.available ?? []"
                :discount-cents="bundleDiscountForPet(petId, bundle)"
                :selected="petBundles[petId]?.bundleId === bundle.id"
                :best-value="bestValueBundleForPet(petId) === bundle.id"
                @click="toggleBundlePet(petId, bundle.id)" />
            </div>
          </BookingSectionPanel>

          <BookingSectionPanel
            kicker="Pick what your pup needs"
            title="Services"
            description="Choose one or more — pricing reflects your pup's size."
            icon="i-lucide-scissors">
            <BookingServicesList
              :services="petContext[petId]?.base ?? []"
              v-model:selected="petBaseServices[petId]"
              @update:selected="autoDetectBundlePet(petId)" />
          </BookingSectionPanel>

          <BookingSectionPanel
            v-if="petContext[petId]?.addons.length"
            kicker="Optional finishing touches"
            title="Add-ons"
            description="Quick extras you can tack on."
            icon="i-lucide-plus-circle">
            <BookingAddonList
              :addons="petContext[petId]!.addons"
              v-model:selected="petAddons[petId]"
              @update:selected="autoDetectBundlePet(petId)" />
          </BookingSectionPanel>
        </div>

        <aside class="lg:col-span-1">
          <div class="lg:sticky lg:top-6">
            <div class="rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm">
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 mb-1">
                Order summary
              </p>

              <h4 class="text-base font-semibold text-default mb-4">{{ getPetName(petId) }}</h4>

              <div
                v-if="!petTotals.get(petId)?.baseItems.length"
                class="text-sm text-muted py-6 text-center">
                Pick a service to see your total.
              </div>

              <div
                v-else
                class="space-y-3 text-sm">
                <div class="space-y-1">
                  <div
                    v-for="item in petTotals.get(petId)?.baseItems"
                    :key="`base-${item.name}`"
                    class="flex justify-between">
                    <span class="text-default">{{ item.name }}</span>
                    <span class="text-default">${{ formatCents(item.priceCents) }}</span>
                  </div>

                  <div
                    v-for="item in petTotals.get(petId)?.addonItems"
                    :key="`addon-${item.name}`"
                    class="flex justify-between text-muted">
                    <span>+ {{ item.name }}</span>
                    <span>${{ formatCents(item.priceCents) }}</span>
                  </div>
                </div>

                <div
                  v-if="(petTotals.get(petId)?.discountCents ?? 0) > 0"
                  class="flex justify-between font-medium text-primary-600 pt-1 border-t border-default/70">
                  <span class="inline-flex items-center gap-1">
                    <UIcon
                      name="i-lucide-sparkles"
                      class="size-3.5" />
                    Bundle discount
                  </span>

                  <span>-${{ formatCents(petTotals.get(petId)!.discountCents) }}</span>
                </div>

                <div class="flex justify-between text-base font-bold pt-2 border-t border-default">
                  <span>Total</span>
                  <span>${{ formatCents(petTotals.get(petId)?.total ?? 0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Step 2: Schedule -->
    <div v-if="step === 2">
      <div
        v-for="petId in selectedPetIds"
        :key="petId"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div class="lg:col-span-2 space-y-6">
          <header class="flex items-center gap-3">
            <span
              class="inline-flex size-9 items-center justify-center rounded-full bg-primary-100/70 text-primary-600">
              <UIcon
                name="i-lucide-paw-print"
                class="size-5" />
            </span>

            <h3 class="text-xl font-semibold leading-none">{{ getPetName(petId) }}</h3>
          </header>

          <BookingSectionPanel
            kicker="Step 1 of 2"
            title="Choose a date"
            description="We'll show openings for that day next."
            icon="i-lucide-calendar">
            <AppDatePicker
              v-model="petDates[petId]"
              :min-value="minBookingDate"
              @update:model-value="onPetDateChange(petId)" />
          </BookingSectionPanel>

          <BookingSectionPanel
            v-if="petDates[petId]"
            kicker="Step 2 of 2"
            title="Pick a time"
            description="Times are grouped by part of day. Tap any opening to lock it in."
            icon="i-lucide-clock">
            <BookingSlotPicker
              :groomers="petAvailability[petId] ?? []"
              :selected-groomer-id="petSlots[petId]?.groomerId"
              :selected-start-time="petSlots[petId]?.startTime"
              :duration-minutes="durationForPet(petId)"
              @select="
                (groomerId, startTime) =>
                  selectSlotPet(petId, groomerId, startTime, calendarDateToString(petDates[petId]!))
              " />
          </BookingSectionPanel>
        </div>

        <aside class="lg:col-span-1">
          <div class="lg:sticky lg:top-6">
            <div class="rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm">
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 mb-1">
                Your appointment
              </p>

              <h4 class="text-base font-semibold text-default mb-4">{{ getPetName(petId) }}</h4>

              <div class="space-y-3 text-sm">
                <div class="flex items-start gap-2">
                  <UIcon
                    name="i-lucide-calendar"
                    class="size-4 text-primary-500 shrink-0 mt-0.5" />

                  <span :class="petDates[petId] ? 'text-default' : 'text-muted italic'">
                    {{
                      petDates[petId]
                        ? formatDate(calendarDateToString(petDates[petId]!), 'long')
                        : 'Pick a date to start'
                    }}
                  </span>
                </div>

                <div class="flex items-start gap-2">
                  <UIcon
                    name="i-lucide-clock"
                    class="size-4 text-primary-500 shrink-0 mt-0.5" />

                  <span :class="petSlots[petId] ? 'text-default' : 'text-muted italic'">
                    {{
                      petSlots[petId]
                        ? formatClockTime(petSlots[petId]!.startTime)
                        : 'No time selected yet'
                    }}
                  </span>
                </div>

                <div
                  v-if="petSlots[petId]"
                  class="flex items-start gap-2">
                  <UIcon
                    name="i-lucide-user"
                    class="size-4 text-primary-500 shrink-0 mt-0.5" />

                  <span class="text-default">with {{ selectedGroomerNameForPet(petId) }}</span>
                </div>

                <div
                  v-if="durationForPet(petId) > 0"
                  class="flex items-start gap-2 pt-2 border-t border-default/60">
                  <UIcon
                    name="i-lucide-timer"
                    class="size-4 text-muted shrink-0 mt-0.5" />

                  <span class="text-muted">{{ durationForPet(petId) }} min appointment</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Step 3: Finalize -->
    <div
      v-if="step === 3"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Inputs: bottom on mobile, left on desktop -->
      <div class="lg:col-span-2 order-2 lg:order-1">
        <BookingSectionPanel
          kicker="Final step"
          title="Payment method"
          :description="
            savedCards.length > 0
              ? 'Pick a card on file or add a new one. You won\'t be charged until your appointment is complete.'
              : 'Add a card to confirm your booking. You won\'t be charged until your appointment is complete.'
          "
          icon="i-lucide-credit-card">
          <div
            v-if="savedCards.length > 0"
            class="space-y-2 mb-4">
            <label
              v-for="card in savedCards"
              :key="card.id"
              class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
              :class="
                selectedPaymentMethodId === card.stripePaymentMethodId
                  ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/30 shadow-sm'
                  : 'border-default bg-white/60 hover:border-primary-400 hover:bg-primary-50/30'
              ">
              <input
                type="radio"
                name="payment-method"
                :value="card.stripePaymentMethodId"
                v-model="selectedPaymentMethodId"
                class="accent-primary-500" />

              <span
                class="inline-flex size-8 items-center justify-center rounded-md bg-primary-100/70 text-primary-600 shrink-0">
                <UIcon
                  name="i-lucide-credit-card"
                  class="size-4" />
              </span>

              <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <span class="text-sm font-semibold capitalize text-default">{{ card.brand }}</span>
                <span class="text-sm text-muted tabular-nums"> •••• {{ card.last4 }} </span>
                <span class="text-xs text-muted tabular-nums">
                  exp {{ card.expMonth }}/{{ card.expYear }}
                </span>
              </div>

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
              size="lg"
              @click="startNewCard" />
          </div>

          <div
            v-else
            class="mt-2 rounded-xl bg-white/60">
            <PaymentCardForm
              v-if="newCardClientSecret"
              ref="cardFormRef"
              :client-secret="newCardClientSecret"
              @update:complete="newCardComplete = $event" />

            <div
              v-else-if="loadingCardSetup"
              class="flex items-center gap-2 text-sm text-muted py-3">
              <UIcon
                name="i-lucide-loader-2"
                class="size-4 animate-spin text-primary-500" />

              <span>Setting up secure payment...</span>
            </div>

            <USwitch
              v-model="saveNewCard"
              label="Save this card for future bookings"
              class="mt-4" />
          </div>

          <p class="mt-4 flex items-center gap-1.5 text-xs text-muted">
            <UIcon
              name="i-lucide-shield-check"
              class="size-3.5 text-primary-500" />

            <span>Card details are encrypted and processed by Stripe.</span>
          </p>
        </BookingSectionPanel>
      </div>

      <!-- Summary: top on mobile, right on desktop -->
      <aside class="lg:col-span-1 order-1 lg:order-2">
        <div class="lg:sticky lg:top-6 space-y-4 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <BookingPetSummaryCard
            v-for="petId in selectedPetIds"
            :key="petId"
            :pet-name="getPetName(petId)"
            :total="petTotals.get(petId)!"
            :slot="petSlots[petId]"
            :groomer-name="selectedGroomerNameForPet(petId)"
            :duration-minutes="durationForPet(petId)" />

          <div
            v-if="selectedPetIds.length > 1"
            class="rounded-2xl bg-primary-500 text-white px-5 py-4 shadow-md flex items-center justify-between">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
                Grand total
              </p>

              <p class="text-xs text-white/70 mt-0.5">{{ selectedPetIds.length }} pups</p>
            </div>
            <span class="text-2xl font-bold tabular-nums">
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

          <div
            v-if="notes"
            class="rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 mb-2">
              Notes for the team
            </p>

            <p class="text-sm text-default leading-relaxed">{{ notes }}</p>
          </div>

          <p class="flex items-center gap-1.5 text-xs text-muted px-1">
            <UIcon
              name="i-lucide-lock"
              class="size-3.5 text-primary-500" />
            <span>
              Secure checkout · You won't be charged until your appointment is complete.
            </span>
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
