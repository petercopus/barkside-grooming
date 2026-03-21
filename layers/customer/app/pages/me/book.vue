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
      additionalCheck = selectedPetIds.value.every((id) => petServices.value[id]);
      break;
    case 2:
      additionalCheck = selectedPetIds.value.every((id) => petSlots.value[id]);
      break;
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
const petServices = ref<Record<string, number>>({});

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

  const serviceId = petServices.value[petId];
  const service = availableServicesForPet(petId).find((s) => s.id === serviceId);
  if (!service) return;

  const { slots } = await $fetch('/api/availability', {
    params: {
      date: calendarDateToString(date),
      duration: service.pricing.durationMinutes,
      serviceId: service.id,
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
      serviceId: petServices.value[petId],
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

    <!-- Step 2: Select services -->
    <div v-if="step === 1">
      <div
        v-for="petId in selectedPetIds"
        :key="petId"
        class="space-y-3 mb-6">
        <h3 class="font-semibold">{{ getPetName(petId) }}</h3>

        <!-- Service options -->
        <ServicesGrid
          :services="availableServicesForPet(petId)"
          v-model:selected="petServices[petId]" />
      </div>
    </div>

    <!-- Step 3: Finalize -->
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
