<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date';

const props = defineProps<{
  step: number;
  serviceData: any;
  bundleData: any;
  addonMapData: any;
  sizeCategoryData: any;
  minBookingDate: CalendarDate;
  notes: string;
}>();

defineExpose({ canAdvance, buildPayload, nextStepHint, refreshAvailability });

const toast = useToast();

/* ─────────────────────────────────── *
 * Guest pet + contact + selections
 * ─────────────────────────────────── */
const {
  guestPet,
  guestContact,
  guestBaseServices,
  guestAddons,
  guestBundle,
  guestSlot,
  guestDate,
} = useBookingState();
const guestAvailability = ref<any[]>([]);

/* ─────────────────────────────────── *
 * Guest payment
 * ─────────────────────────────────── */
const guestStripeCustomerId = ref<string | null>(null);
const guestCardClientSecret = ref('');
const guestCardComplete = ref(false);
const loadingGuestCardSetup = ref(false);
const cardFormRef = ref<{ confirm: () => Promise<string> } | null>(null);

const guestContactReady = computed(
  () =>
    guestContact.value.firstName.trim().length > 0 &&
    guestContact.value.lastName.trim().length > 0 &&
    guestContact.value.email.trim().length > 0 &&
    guestContact.value.phone.trim().length > 0,
);

async function fetchGuestSetupIntent() {
  if (loadingGuestCardSetup.value || guestCardClientSecret.value) return;
  loadingGuestCardSetup.value = true;

  try {
    const res = await $fetch<{ clientSecret: string; stripeCustomerId: string }>(
      '/api/payment-methods/guest-setup-intent',
      { method: 'POST' },
    );

    guestCardClientSecret.value = res.clientSecret;
    guestStripeCustomerId.value = res.stripeCustomerId;
  } catch {
    toast.add({ title: 'Failed to start card setup', color: 'error' });
  } finally {
    loadingGuestCardSetup.value = false;
  }
}

watch(
  () => props.step,
  (s) => {
    if (s === 3) void fetchGuestSetupIntent();
  },
);

/* ─────────────────────────────────── *
 * Resolved size category
 * ─────────────────────────────────── */
const guestSizeCategoryMatch = computed(() => {
  if (!guestPet.value.weightLbs) return null;

  const categories = props.sizeCategoryData?.sizeCategories ?? [];

  return (
    categories.find(
      (cat: any) =>
        guestPet.value.weightLbs! >= cat.minWeight && guestPet.value.weightLbs! <= cat.maxWeight,
    ) ?? null
  );
});

const guestSizeCategoryId = computed(() => guestSizeCategoryMatch.value?.id ?? null);
const guestSizeCategoryName = computed(() => guestSizeCategoryMatch.value?.name ?? '');

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

function availableServicesForGuest() {
  return servicesForSizeCategory(guestSizeCategoryId.value);
}

function baseServicesForGuest() {
  return availableServicesForGuest().filter((s: any) => !s.isAddon);
}

function availableBundlesForGuest() {
  const guestServices = availableServicesForGuest();
  const guestServiceIds = new Set(guestServices.map((s: any) => s.id));

  return (props.bundleData?.bundles ?? []).filter((bundle: any) =>
    bundle.serviceIds.every((id: number) => guestServiceIds.has(id)),
  );
}

function compatibleAddonsForGuest() {
  if (!guestBaseServices.value.length) return [];

  const addonMap = props.addonMapData?.addonMap ?? {};
  const compatibleAddonIds = new Set(guestBaseServices.value.flatMap((id) => addonMap[id] ?? []));

  return availableServicesForGuest().filter((s: any) => s.isAddon && compatibleAddonIds.has(s.id));
}

const guestContext = computed(() => ({
  available: availableServicesForGuest(),
  base: baseServicesForGuest(),
  bundles: availableBundlesForGuest(),
  addons: compatibleAddonsForGuest(),
}));

/* ─────────────────────────────────── *
 * Bundle partition + toggle
 * ─────────────────────────────────── */
function partitionBundleServices(
  allServices: ReturnType<typeof availableServicesForGuest>,
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
  allServices: ReturnType<typeof availableServicesForGuest>,
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

function toggleBundleGuest(bundleId: number) {
  const bundle = (props.bundleData?.bundles ?? []).find((b: any) => b.id === bundleId);
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
    if (!bundle.serviceIds.every((id: number) => allSelectedIds.has(id))) continue;

    const discount = computeBundleDiscount(allServices, bundle);
    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestBundle = bundle;
    }
  }

  const previousId = guestBundle.value?.bundleId ?? null;
  guestBundle.value = bestBundle ? { bundleId: bestBundle.id, discountCents: bestDiscount } : null;

  if (bestBundle && bestBundle.id !== previousId) {
    toast.add({
      title: `${bestBundle.name} applied`,
      description: `You saved $${formatCents(bestDiscount)}.`,
      icon: 'i-lucide-sparkles',
      color: 'success',
    });
  }
}

const bestValueBundleId = computed(() => {
  const allServices = availableServicesForGuest();
  const bundles = availableBundlesForGuest();
  if (bundles.length < 2) return null;

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
});

function bundleDiscountFor(bundle: any) {
  return computeBundleDiscount(availableServicesForGuest(), bundle);
}

/* ─────────────────────────────────── *
 * Pricing totals
 * ─────────────────────────────────── */
function computeTotal(
  allServices: ReturnType<typeof availableServicesForGuest>,
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

const guestTotalResult = computed(() =>
  computeTotal(
    availableServicesForGuest(),
    guestBaseServices.value,
    guestAddons.value,
    guestBundle.value?.discountCents ?? 0,
  ),
);

/* ─────────────────────────────────── *
 * Availability + slot selection
 * ─────────────────────────────────── */
const { schedule, isCompleteCalendarDate } = useBookingAvailability();

function onGuestDateChange() {
  guestSlot.value = null;
  schedule('guest', () => fetchAvailabilityGuest());
}

const guestTotalDuration = computed(() => {
  const allServices = availableServicesForGuest();
  const allIds = [...guestBaseServices.value, ...guestAddons.value];

  return allIds.reduce((sum, svcId) => {
    const svc = allServices.find((s: any) => s.id === svcId);
    return sum + (svc?.pricing.durationMinutes ?? 0);
  }, 0);
});

async function fetchAvailabilityGuest() {
  if (!isCompleteCalendarDate(guestDate.value)) return;
  if (!guestBaseServices.value.length) return;

  const totalDuration = guestTotalDuration.value;
  if (totalDuration <= 0) return;

  const allIds = [...guestBaseServices.value, ...guestAddons.value];
  const { slots } = await $fetch('/api/availability', {
    params: {
      date: calendarDateToString(guestDate.value),
      duration: totalDuration,
      serviceIds: allIds.join(','),
    },
  });

  guestAvailability.value = slots;
}

const guestSelectedGroomerName = computed(() => {
  if (!guestSlot.value) return '';

  const g = guestAvailability.value.find((g: any) => g.groomerId === guestSlot.value!.groomerId);
  return g?.groomerName ?? 'Groomer';
});

function selectSlotGuest(groomerId: string, startTime: string, scheduledDate: string) {
  guestSlot.value = { scheduledDate, groomerId, startTime };
}

/* ─────────────────────────────────── *
 * Restore / re-fetch availability
 * ─────────────────────────────────── */
async function refreshAvailability() {
  guestSlot.value = null;

  if (guestDate.value && guestBaseServices.value.length > 0) {
    await fetchAvailabilityGuest();
  }
}

onMounted(async () => {
  await nextTick(); // wait one tick for parent's hydration
  if (guestDate.value && guestBaseServices.value.length > 0) {
    fetchAvailabilityGuest();
  }
});

/* ─────────────────────────────────── *
 * Shell contract
 * ─────────────────────────────────── */
function canAdvance(step: number): boolean {
  switch (step) {
    case 0:
      return (
        guestPet.value.name.trim().length > 0 &&
        !!guestPet.value.weightLbs &&
        !!guestSizeCategoryId.value
      );
    case 1:
      return guestBaseServices.value.length > 0;
    case 2:
      return !!guestSlot.value;
    case 3:
      return guestContactReady.value && guestCardComplete.value;
    default:
      return false;
  }
}

function nextStepHint(step: number): string | null {
  switch (step) {
    case 0: {
      if (!guestPet.value.name.trim()) return "Add your pup's name to continue.";
      if (!guestPet.value.weightLbs) return 'Enter a weight so we can show the right services.';
      if (!guestSizeCategoryId.value)
        return 'That weight is outside our size ranges — double-check it.';
      return null;
    }
    case 1:
      return guestBaseServices.value.length > 0 ? null : 'Pick at least one service to continue.';
    case 2:
      return guestSlot.value ? null : 'Choose a date and time slot to continue.';
    case 3: {
      const missing: string[] = [];
      if (!guestContactReady.value) missing.push('contact details');
      if (!guestCardComplete.value) missing.push('card details');
      return missing.length ? `Add your ${missing.join(' and ')} to continue.` : null;
    }
    default:
      return null;
  }
}

async function buildPayload() {
  if (!cardFormRef.value) return null;

  let paymentMethodId: string;

  try {
    paymentMethodId = await cardFormRef.value.confirm();
  } catch {
    return null;
  }

  return {
    endpoint: '/api/appointments/guest' as const,
    body: {
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
      paymentMethodId,
      stripeCustomerId: guestStripeCustomerId.value || undefined,
    },
    onSuccess: (res: any) => {
      if (!res?.appointment) throw new Error('Booking failed');
      return `/book/confirmation?id=${res.appointment.id}`;
    },
  };
}
</script>

<template>
  <div>
    <!-- Step 0: Pet info -->
    <div v-if="step === 0">
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
            required
            help="We use this to match your pup to the right service pricing.">
            <UInput
              v-model.number="guestPet.weightLbs"
              type="number"
              placeholder="e.g. 45"
              :min="1"
              :max="300" />
          </UFormField>

          <div
            v-if="guestPet.weightLbs && guestSizeCategoryName"
            class="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
            <UIcon
              name="i-lucide-paw-print"
              class="size-4 text-primary-500" />

            <span>
              That counts as a
              <strong class="font-semibold">{{ guestSizeCategoryName }}</strong>
              dog.
            </span>
          </div>
          <p
            v-else-if="guestPet.weightLbs && !guestSizeCategoryId"
            class="text-sm text-warning flex items-center gap-1.5">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-4 shrink-0" />

            <span>That weight is outside our size ranges — please double-check it.</span>
          </p>
        </div>
      </AppCard>
    </div>

    <!-- Step 1: Services -->
    <div v-if="step === 1">
      <div
        v-if="!guestSizeCategoryId"
        class="text-center py-8">
        <p class="text-muted">
          Please go back and enter your pet's weight to see available services and pricing.
        </p>
      </div>

      <div
        v-else
        class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <BookingSectionPanel
            v-if="guestContext.bundles.length"
            kicker="Save with a bundle"
            title="Bundles &amp; savings"
            description="Pre-picked combos with the lowest price per service."
            icon="i-lucide-sparkles">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BookingBundleCard
                v-for="bundle in guestContext.bundles"
                :key="bundle.id"
                :bundle="bundle"
                :services="guestContext.available"
                :discount-cents="bundleDiscountFor(bundle)"
                :selected="guestBundle?.bundleId === bundle.id"
                :best-value="bestValueBundleId === bundle.id"
                @click="toggleBundleGuest(bundle.id)" />
            </div>
          </BookingSectionPanel>

          <BookingSectionPanel
            kicker="Pick what your pup needs"
            title="Services"
            description="Choose one or more — pricing reflects your pup's size."
            icon="i-lucide-scissors">
            <BookingServicesList
              :services="guestContext.base"
              v-model:selected="guestBaseServices"
              @update:selected="autoDetectBundleGuest()" />
          </BookingSectionPanel>

          <BookingSectionPanel
            v-if="guestContext.addons.length"
            kicker="Optional finishing touches"
            title="Add-ons"
            description="Quick extras you can tack on."
            icon="i-lucide-plus-circle">
            <BookingAddonList
              :addons="guestContext.addons"
              v-model:selected="guestAddons"
              @update:selected="autoDetectBundleGuest()" />
          </BookingSectionPanel>
        </div>

        <aside class="lg:col-span-1">
          <div class="lg:sticky lg:top-6">
            <div class="rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm">
              <p
                class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 mb-1">
                Order summary
              </p>

              <h4 class="text-base font-semibold text-default mb-4">
                {{ guestPet.name || 'Your pup' }}
              </h4>

              <div
                v-if="!guestTotalResult.baseItems.length"
                class="text-sm text-muted py-6 text-center">
                Pick a service to see your total.
              </div>

              <div
                v-else
                class="space-y-3 text-sm">
                <div class="space-y-1">
                  <div
                    v-for="item in guestTotalResult.baseItems"
                    :key="`base-${item.name}`"
                    class="flex justify-between">
                    <span class="text-default">{{ item.name }}</span>
                    <span class="text-default">${{ formatCents(item.priceCents) }}</span>
                  </div>

                  <div
                    v-for="item in guestTotalResult.addonItems"
                    :key="`addon-${item.name}`"
                    class="flex justify-between text-muted">
                    <span>+ {{ item.name }}</span>
                    <span>${{ formatCents(item.priceCents) }}</span>
                  </div>
                </div>

                <div
                  v-if="guestTotalResult.discountCents > 0"
                  class="flex justify-between font-medium text-primary-600 pt-1 border-t border-default/70">
                  <span class="inline-flex items-center gap-1">
                    <UIcon
                      name="i-lucide-sparkles"
                      class="size-3.5" />
                    Bundle discount
                  </span>

                  <span>-${{ formatCents(guestTotalResult.discountCents) }}</span>
                </div>

                <div class="flex justify-between text-base font-bold pt-2 border-t border-default">
                  <span>Total</span>
                  <span>${{ formatCents(guestTotalResult.total) }}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- Step 2: Schedule -->
    <div
      v-if="step === 2"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <header class="flex items-center gap-3">
          <span
            class="inline-flex size-9 items-center justify-center rounded-full bg-primary-100/70 text-primary-600">
            <UIcon
              name="i-lucide-paw-print"
              class="size-5" />
          </span>

          <h3 class="text-xl font-semibold leading-none">{{ guestPet.name || 'Your pup' }}</h3>
        </header>

        <BookingSectionPanel
          kicker="Step 1 of 2"
          title="Choose a date"
          description="We'll show openings for that day next."
          icon="i-lucide-calendar">
          <AppDatePicker
            v-model="guestDate"
            :min-value="minBookingDate"
            @update:model-value="onGuestDateChange()" />
        </BookingSectionPanel>

        <BookingSectionPanel
          v-if="guestDate"
          kicker="Step 2 of 2"
          title="Pick a time"
          description="Times are grouped by part of day. Tap any opening to lock it in."
          icon="i-lucide-clock">
          <BookingSlotPicker
            :groomers="guestAvailability"
            :selected-groomer-id="guestSlot?.groomerId"
            :selected-start-time="guestSlot?.startTime"
            :duration-minutes="guestTotalDuration"
            @select="
              (groomerId, startTime) =>
                selectSlotGuest(groomerId, startTime, calendarDateToString(guestDate!))
            " />
        </BookingSectionPanel>
      </div>

      <aside class="lg:col-span-1">
        <div class="lg:sticky lg:top-6">
          <div class="rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm">
            <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 mb-1">
              Your appointment
            </p>

            <h4 class="text-base font-semibold text-default mb-4">
              {{ guestPet.name || 'Your pup' }}
            </h4>

            <div class="space-y-3 text-sm">
              <div class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-calendar"
                  class="size-4 text-primary-500 shrink-0 mt-0.5" />

                <span :class="guestDate ? 'text-default' : 'text-muted italic'">
                  {{
                    guestDate
                      ? formatDate(calendarDateToString(guestDate), 'long')
                      : 'Pick a date to start'
                  }}
                </span>
              </div>

              <div class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-clock"
                  class="size-4 text-primary-500 shrink-0 mt-0.5" />

                <span :class="guestSlot ? 'text-default' : 'text-muted italic'">
                  {{ guestSlot ? formatClockTime(guestSlot.startTime) : 'No time selected yet' }}
                </span>
              </div>

              <div
                v-if="guestSlot"
                class="flex items-start gap-2">
                <UIcon
                  name="i-lucide-user"
                  class="size-4 text-primary-500 shrink-0 mt-0.5" />

                <span class="text-default">with {{ guestSelectedGroomerName }}</span>
              </div>

              <div
                v-if="guestTotalDuration > 0"
                class="flex items-start gap-2 pt-2 border-t border-default/60">
                <UIcon
                  name="i-lucide-timer"
                  class="size-4 text-muted shrink-0 mt-0.5" />

                <span class="text-muted">{{ guestTotalDuration }} min appointment</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Step 3: Finalize -->
    <div
      v-if="step === 3"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Inputs: bottom on mobile, left on desktop -->
      <div class="lg:col-span-2 order-2 lg:order-1 space-y-6">
        <BookingSectionPanel
          kicker="Step 1 of 2"
          title="Your contact details"
          description="So we can reach you about the appointment."
          icon="i-lucide-user-round">
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField
                label="First name"
                required>
                <UInput
                  v-model="guestContact.firstName"
                  placeholder="First name" />
              </UFormField>

              <UFormField
                label="Last name"
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
              <UFormField label="Emergency contact name">
                <UInput
                  v-model="guestContact.emergencyContactName"
                  placeholder="Optional" />
              </UFormField>

              <UFormField label="Emergency contact phone">
                <UInput
                  v-model="guestContact.emergencyContactPhone"
                  type="tel"
                  placeholder="Optional" />
              </UFormField>
            </div>
          </div>
        </BookingSectionPanel>

        <BookingSectionPanel
          kicker="Step 2 of 2"
          title="Payment method"
          description="A card is required to hold your booking. You won't be charged until your appointment is complete."
          icon="i-lucide-credit-card">
          <PaymentCardForm
            v-if="guestCardClientSecret"
            ref="cardFormRef"
            :client-secret="guestCardClientSecret"
            @update:complete="guestCardComplete = $event" />

          <div
            v-else
            class="flex items-center gap-2 text-sm text-muted py-3">
            <UIcon
              name="i-lucide-loader-2"
              class="size-4 animate-spin text-primary-500" />

            <span>Setting up secure payment&hellip;</span>
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
        <div class="lg:sticky lg:top-6 space-y-4">
          <BookingPetSummaryCard
            :pet-name="guestPet.name"
            :total="guestTotalResult"
            :slot="guestSlot"
            :groomer-name="guestSelectedGroomerName"
            :duration-minutes="guestTotalDuration" />

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
