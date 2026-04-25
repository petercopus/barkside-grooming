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
 * Stepper
 * ─────────────────────────────────── */
const step = ref(0);

const stepperItems = computed<StepperItem[]>(() => {
  const defaults: StepperItem[] = [
    { title: 'Pet', description: 'Pet info', icon: 'i-lucide-paw-print' },
    { title: 'Services', description: 'Select services', icon: 'i-lucide-scissors' },
    { title: 'Schedule', description: 'Pick date & time', icon: 'i-lucide-calendar' },
    { title: 'Finalize', icon: 'i-lucide-check' },
  ];

  if (props.stepLabels?.length) {
    return defaults.map((item, i) => ({
      ...item,
      title: props.stepLabels![i]?.label ?? item.title,
    }));
  }

  return defaults;
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
 * Shared notes
 * ─────────────────────────────────── */
const notes = ref('');

/* ─────────────────────────────────── *
 * Active branch
 * ─────────────────────────────────── */
type BranchApi = {
  canAdvance: (step: number) => boolean;
  buildPayload: () => {
    endpoint: string;
    body: Record<string, unknown>;
    onSuccess: (res: any) => string;
  };
};
const branch = useTemplateRef<BranchApi | null>('branch');

const canNextStep = computed(() => {
  if (step.value >= stepperItems.value.length) return false;
  return branch.value?.canAdvance(step.value) ?? false;
});
const canPrevStep = computed(() => step.value > 0);

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
  const payload = branch.value?.buildPayload();
  if (!payload) return;

  submitting.value = true;
  try {
    const body = { ...payload.body, notes: notes.value || undefined };
    const res = await $fetch(payload.endpoint, { method: 'POST', body });
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
      v-model="step"
      :items="stepperItems"
      class="mb-12 mt-6" />

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

    <UTextarea
      v-if="step === 2"
      v-model="notes"
      placeholder="Any special notes or requests..."
      class="mt-4" />

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
</template>
