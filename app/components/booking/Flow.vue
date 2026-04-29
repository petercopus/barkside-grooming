<script setup lang="ts">
import { getLocalTimeZone, today } from '@internationalized/date';
import type { StepperItem } from '@nuxt/ui';

const props = withDefaults(
  defineProps<{
    guestCheckoutEnabled?: boolean;
    submitButtonText?: string;
    stepLabels?: { label: string }[];
    showProgressBar?: boolean;
  }>(),
  {
    guestCheckoutEnabled: true,
    submitButtonText: 'Submit Booking',
    showProgressBar: true,
  },
);

const { isLoggedIn } = useAuth();
const toast = useToast();

const minBookingDate = today(getLocalTimeZone());

/* ─────────────────────────────────── *
 * Persisted wizard state
 * ─────────────────────────────────── */
const bookingState = useBookingState();
const { step, notes } = bookingState;

// Reset whenever login state changes and onMount
if (import.meta.client) {
  watch(
    isLoggedIn,
    (next, prev) => {
      if (prev !== undefined && next !== prev) bookingState.clear();
    },
    { flush: 'post' },
  );

  onMounted(() => {
    const { selectedPetIds, guestPet } = bookingState;
    const onAuthBranchWithGuestData = isLoggedIn.value && !!guestPet.value.name;
    const onGuestBranchWithAuthData = !isLoggedIn.value && selectedPetIds.value.length > 0;
    if (onAuthBranchWithGuestData || onGuestBranchWithAuthData) bookingState.clear();
  });
}

const stepperItems = computed<(StepperItem & { value: number })[]>(() => {
  const defaults = [
    { title: 'Pet', description: 'Pet info', icon: 'i-lucide-paw-print' },
    { title: 'Services', description: 'Select services', icon: 'i-lucide-scissors' },
    { title: 'Schedule', description: 'Pick date & time', icon: 'i-lucide-calendar' },
    { title: 'Finalize', icon: 'i-lucide-credit-card' },
  ];

  return defaults.map((item, i) => ({
    ...item,
    value: i,
    title: props.stepLabels?.[i]?.label ?? item.title,
  }));
});

/* ─────────────────────────────────── *
 * Shared reference data
 * ─────────────────────────────────── */
const [
  { data: serviceData },
  { data: bundleData },
  { data: addonMapData },
  { data: sizeCategoryData },
  { data: petData },
] = await Promise.all([
  useFetch('/api/services'),
  useFetch('/api/bundles'),
  useFetch('/api/services/addon-map'),
  useFetch('/api/size-categories'),
  isLoggedIn.value ? useFetch('/api/pets') : Promise.resolve({ data: ref(null) }),
]);

/* ─────────────────────────────────── *
 * Active branch
 * ─────────────────────────────────── */
type BranchPayload = {
  endpoint: string;
  body: Record<string, unknown>;
  onSuccess: (res: any) => string;
};
type BranchApi = {
  canAdvance: (step: number) => boolean;
  nextStepHint: (step: number) => string | null;
  buildPayload: () => Promise<BranchPayload | null>;
};
const branch = useTemplateRef<BranchApi | null>('branch');

const canNextStep = computed(() => {
  if (step.value >= stepperItems.value.length) return false;
  return branch.value?.canAdvance(step.value) ?? false;
});
const canPrevStep = computed(() => step.value > 0);
const nextStepHint = computed(() => {
  if (canNextStep.value) return null;
  return branch.value?.nextStepHint(step.value) ?? null;
});

function nextStep() {
  if (canNextStep.value) step.value++;
}
function prevStep() {
  if (canPrevStep.value) step.value--;
}

/* ─────────────────────────────────── *
 * Submit
 * ─────────────────────────────────── */
const submitting = ref(false);

async function submitBooking() {
  if (!branch.value) return;

  submitting.value = true;
  try {
    const payload = await branch.value.buildPayload();

    // Branch returns null when payment-method confirmation failed
    if (!payload) return;

    const body = { ...payload.body, notes: notes.value || undefined };
    const res = await $fetch(payload.endpoint, { method: 'POST', body });

    bookingState.clear();
    await navigateTo(payload.onSuccess(res));
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
</script>

<template>
  <div>
    <UStepper
      v-if="showProgressBar"
      disabled
      color="primary"
      v-model="step"
      :items="stepperItems"
      :ui="{
        trigger:
          'rounded-full text-center align-middle flex items-center justify-center font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 cursor-default ' +
          'group-data-[state=active]:text-inverted group-data-[state=active]:bg-primary-500 group-data-[state=active]:shadow-md group-data-[state=active]:ring-4 group-data-[state=active]:ring-primary-500/15 ' +
          'group-data-[state=completed]:text-inverted group-data-[state=completed]:bg-primary-500/90 ' +
          'group-data-[state=inactive]:text-muted group-data-[state=inactive]:bg-elevated group-data-[state=inactive]:border group-data-[state=inactive]:border-default',
        separator:
          'absolute rounded-full bg-black/20 group-data-[state=completed]:bg-primary-500 transition-colors',
        title:
          'font-medium group-data-[state=active]:text-default group-data-[state=completed]:text-default group-data-[state=inactive]:text-muted',
      }"
      class="mb-10 mt-6">
      <template #indicator="{ item }">
        <UIcon
          v-if="(item as any).value < step"
          name="i-lucide-check"
          class="size-5" />
        <UIcon
          v-else-if="item.icon"
          :name="item.icon"
          class="size-5" />
      </template>
    </UStepper>

    <BookingFlowAuth
      v-if="isLoggedIn"
      ref="branch"
      :step="step"
      :service-data="serviceData"
      :bundle-data="bundleData"
      :addon-map-data="addonMapData"
      :size-category-data="sizeCategoryData"
      :pet-data="petData"
      :min-booking-date="minBookingDate"
      :notes="notes" />

    <BookingFlowGuest
      v-else-if="guestCheckoutEnabled"
      ref="branch"
      :step="step"
      :service-data="serviceData"
      :bundle-data="bundleData"
      :addon-map-data="addonMapData"
      :size-category-data="sizeCategoryData"
      :min-booking-date="minBookingDate"
      :notes="notes" />

    <div
      v-else
      class="text-center py-12">
      <p class="text-muted mb-4">Please sign in to book an appointment.</p>

      <UButton
        to="/login"
        label="Sign In" />
    </div>

    <div
      v-if="step === 3"
      class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div class="lg:col-span-2">
        <BookingSectionPanel
          kicker="Optional"
          title="Notes for the team"
          description="Anything we should know — temperament, sensitivities, special requests."
          icon="i-lucide-message-square">
          <UTextarea
            v-model="notes"
            :rows="3"
            placeholder="e.g. Sensitive around the paws, please go slow with the clippers."
            class="w-full" />
        </BookingSectionPanel>
      </div>
    </div>

    <!-- Navigation buttons -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
      <p
        v-if="nextStepHint"
        class="text-sm text-muted flex items-center gap-1.5">
        <UIcon
          name="i-lucide-info"
          class="size-4 text-primary-500 shrink-0" />

        <span>{{ nextStepHint }}</span>
      </p>

      <span
        v-else
        class="hidden sm:block" />

      <div class="flex justify-end gap-2">
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
          :label="submitButtonText"
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
  </div>
</template>
