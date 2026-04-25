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

const toast = useToast();

/* ─────────────────────────────────── *
 * Guest pet + contact + selections
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

/* ─────────────────────────────────── *
 * Guest payment
 * ─────────────────────────────────── */
const guestPaymentMethodId = ref<string | null>(null);
const guestStripeCustomerId = ref<string | null>(null);
const guestCardClientSecret = ref('');
const showGuestCardForm = ref(false);
const loadingGuestCardSetup = ref(false);

const guestContactReady = computed(
  () =>
    guestContact.value.firstName.trim().length > 0 &&
    guestContact.value.lastName.trim().length > 0 &&
    guestContact.value.email.trim().length > 0 &&
    guestContact.value.phone.trim().length > 0,
);

async function startGuestCard() {
  if (!guestContactReady.value) {
    toast.add({ title: 'Please fill in your contact details first', color: 'warning' });
    return;
  }
  loadingGuestCardSetup.value = true;
  try {
    const res = await $fetch<{ clientSecret: string; stripeCustomerId: string }>(
      '/api/payment-methods/guest-setup-intent',
      {
        method: 'POST',
        body: {
          email: guestContact.value.email,
          firstName: guestContact.value.firstName,
          lastName: guestContact.value.lastName,
        },
      },
    );
    guestCardClientSecret.value = res.clientSecret;
    guestStripeCustomerId.value = res.stripeCustomerId;
    showGuestCardForm.value = true;
  } catch {
    toast.add({ title: 'Failed to start card setup', color: 'error' });
  } finally {
    loadingGuestCardSetup.value = false;
  }
}

function onGuestCardConfirmed(pmId: string) {
  guestPaymentMethodId.value = pmId;
  showGuestCardForm.value = false;
}

/* ─────────────────────────────────── *
 * Resolved size category
 * ─────────────────────────────────── */
const guestSizeCategoryId = computed(() => {
  if (!guestPet.value.weightLbs) return null;
  const categories = props.sizeCategoryData?.sizeCategories ?? [];
  const match = categories.find(
    (cat: any) =>
      guestPet.value.weightLbs! >= cat.minWeight && guestPet.value.weightLbs! <= cat.maxWeight,
  );
  return match?.id ?? null;
});

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

  guestBundle.value = bestBundle ? { bundleId: bestBundle.id, discountCents: bestDiscount } : null;
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
  schedule('guest', () => fetchAvailabilityGuest());
}

async function fetchAvailabilityGuest() {
  if (!isCompleteCalendarDate(guestDate.value)) return;
  if (!guestBaseServices.value.length) return;

  const allServices = availableServicesForGuest();
  const allIds = [...guestBaseServices.value, ...guestAddons.value];
  const totalDuration = allIds.reduce((sum, svcId) => {
    const svc = allServices.find((s: any) => s.id === svcId);
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

function selectSlotGuest(groomerId: string, startTime: string, scheduledDate: string) {
  guestSlot.value = { scheduledDate, groomerId, startTime };
}

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
      return guestContactReady.value && !!guestPaymentMethodId.value;
    default:
      return false;
  }
}

function buildPayload() {
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
      paymentMethodId: guestPaymentMethodId.value || undefined,
      stripeCustomerId: guestStripeCustomerId.value || undefined,
    },
    onSuccess: (res: any) => {
      if (!res?.appointment) throw new Error('Booking failed');
      return `/book/confirmation?id=${res.appointment.id}`;
    },
  };
}

defineExpose({ canAdvance, buildPayload });
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
          <UFormField label="Weight (lbs)">
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

      <div v-else>
        <div
          v-if="guestContext.bundles.length"
          class="mb-6">
          <h4 class="text-sm font-medium text-muted mb-2">Bundles</h4>
          <UPageGrid>
            <UPageCard
              v-for="bundle in guestContext.bundles"
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

        <div class="mb-6">
          <h4 class="text-sm font-medium text-muted mb-2">Services</h4>
          <ServicesGrid
            :services="guestContext.base"
            v-model:selected="guestBaseServices"
            @update:selected="autoDetectBundleGuest()" />
        </div>

        <div
          v-if="guestContext.addons.length"
          class="mb-6">
          <h4 class="text-sm font-medium text-muted mb-2">Addons</h4>
          <ServicesGrid
            :services="guestContext.addons"
            v-model:selected="guestAddons"
            @update:selected="autoDetectBundleGuest()" />
        </div>

        <AppCard v-if="guestBaseServices.length > 0">
          <div class="p-4 space-y-1 text-sm">
            <div
              v-for="item in guestTotalResult.baseItems"
              :key="item.name"
              class="flex justify-between">
              <span>{{ item.name }}</span>
              <span>${{ formatCents(item.priceCents) }}</span>
            </div>
            <div
              v-for="item in guestTotalResult.addonItems"
              :key="item.name"
              class="flex justify-between text-muted">
              <span>{{ item.name }}</span>
              <span>${{ formatCents(item.priceCents) }}</span>
            </div>
            <div
              v-if="guestTotalResult.discountCents > 0"
              class="flex justify-between text-success">
              <span>Bundle discount</span>
              <span>-${{ formatCents(guestTotalResult.discountCents) }}</span>
            </div>
            <hr class="my-2 border-default" />
            <div class="flex justify-between font-semibold">
              <span>Total</span>
              <span>${{ formatCents(guestTotalResult.total) }}</span>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Step 2: Schedule -->
    <div v-if="step === 2">
      <div class="space-y-4">
        <h3 class="font-semibold">{{ guestPet.name }}</h3>
        <AppDatePicker
          v-model="guestDate"
          :min-value="minBookingDate"
          @update:model-value="onGuestDateChange()" />
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
    </div>

    <!-- Step 3: Finalize -->
    <div v-if="step === 3">
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

      <h4 class="font-semibold mb-3">{{ guestPet.name }}</h4>
      <AppCard>
        <div>
          <p class="font-medium mb-1">Services</p>
          <div
            v-for="item in guestTotalResult.baseItems"
            :key="item.name"
            class="flex justify-between">
            <span>{{ item.name }}</span>
            <span>${{ formatCents(item.priceCents) }}</span>
          </div>
        </div>

        <div v-if="guestTotalResult.addonItems.length">
          <p class="font-medium mb-1">Add-ons</p>
          <div
            v-for="item in guestTotalResult.addonItems"
            :key="item.name"
            class="flex justify-between">
            <span>{{ item.name }}</span>
            <span>${{ formatCents(item.priceCents) }}</span>
          </div>
        </div>

        <div
          v-if="guestTotalResult.discountCents > 0"
          class="flex justify-between text-success">
          <span>Bundle discount</span>
          <span>-${{ formatCents(guestTotalResult.discountCents) }}</span>
        </div>

        <hr class="border-default" />

        <div
          v-if="guestSlot"
          class="flex justify-between">
          <span>{{ guestSlot.scheduledDate }} at {{ guestSlot.startTime }}</span>
        </div>

        <div class="flex justify-between font-semibold text-base">
          <span>Total</span>
          <span>${{ formatCents(guestTotalResult.total) }}</span>
        </div>
      </AppCard>

      <div
        v-if="notes"
        class="mt-4">
        <p class="text-sm font-medium mb-1">Notes</p>
        <p class="text-sm text-muted">{{ notes }}</p>
      </div>

      <AppCard
        title="Payment Method"
        class="mt-6">
        <div
          v-if="guestPaymentMethodId"
          class="flex items-center gap-2 text-sm text-success">
          <UIcon name="i-lucide-check-circle" />
          <span>Card added successfully</span>
        </div>

        <div v-else-if="!showGuestCardForm">
          <p class="text-sm text-muted mb-3">
            A card is required to complete your booking. You will not be charged until your
            appointment is complete.
          </p>
          <UButton
            label="Add a card"
            icon="i-lucide-credit-card"
            variant="outline"
            :loading="loadingGuestCardSetup"
            :disabled="!guestContactReady"
            @click="startGuestCard" />
          <p
            v-if="!guestContactReady"
            class="text-xs text-muted mt-2">
            Fill in your contact details above first.
          </p>
        </div>

        <div v-else>
          <PaymentCardForm
            :client-secret="guestCardClientSecret"
            @confirmed="onGuestCardConfirmed"
            @error="(msg: string) => toast.add({ title: msg, color: 'error' })" />
        </div>
      </AppCard>
    </div>
  </div>
</template>
