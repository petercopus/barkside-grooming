<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { createPetSchema, updatePetSchema, type CreatePetInput } from '~~/shared/schemas/pet';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  petId?: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createPetSchema : updatePetSchema));

/* ─────────────────────────────────── *
 *  Form State
 * ─────────────────────────────────── */
const dobCalendar = shallowRef(
  parseCalendarDate(props.initialValues?.dateOfBirth as string | undefined),
);

const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  breed: (props.initialValues?.breed as string) ?? undefined,
  weightLbs: (props.initialValues?.weightLbs as number) ?? undefined,
  dateOfBirth: computed(() => formatCalendarDate(dobCalendar.value)),
  gender: (props.initialValues?.gender as CreatePetInput['gender']) ?? undefined,
  coatType: (props.initialValues?.coatType as string) ?? undefined,
  specialNotes: (props.initialValues?.specialNotes as string) ?? undefined,
});

const genderItems = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

/* ─────────────────────────────────── *
 *  Create Mode
 * ─────────────────────────────────── */
const create = isCreate.value ? useFormAction({ redirectTo: '/me/pets' }) : null;

/* ─────────────────────────────────── *
 *  Edit Mode
 * ─────────────────────────────────── */
const pageSave = !isCreate.value
  ? usePageSave({
      sections: {
        details: {
          track: () => ({
            name: state.name,
            breed: state.breed,
            weightLbs: state.weightLbs,
            dateOfBirth: state.dateOfBirth,
            gender: state.gender,
            coatType: state.coatType,
            specialNotes: state.specialNotes,
          }),
          save: (data) => $fetch(`/api/pets/${props.petId}`, { method: 'PATCH', body: data }),
        },
      },
      successMessage: 'Pet updated',
    })
  : null;

/* ─────────────────────────────────── *
 *  Submit
 * ─────────────────────────────────── */
const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    create!.execute(() =>
      $fetch('/api/pets', { method: 'POST', body: event.data as CreatePetInput }),
    );
  } else {
    pageSave!.submit();
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    @submit="onSubmit">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] items-start gap-6">
      <!-- Left -->
      <div class="space-y-6">
        <AppSection :error="error">
          <div class="space-y-4">
            <!-- Name -->
            <UFormField
              label="Name"
              name="name"
              required>
              <UInput v-model="state.name" />
            </UFormField>

            <!-- Breed -->
            <UFormField
              label="Breed"
              name="breed">
              <UInput v-model="state.breed" />
            </UFormField>

            <!-- Weight -->
            <UFormField
              label="Weight (lbs)"
              name="weightLbs">
              <UInputNumber
                v-model="state.weightLbs"
                :min="1"
                :max="300" />
            </UFormField>

            <!-- Birthday -->
            <UFormField
              label="Date of Birth"
              name="dateOfBirth">
              <AppDatePicker v-model="dobCalendar" />
            </UFormField>
          </div>
        </AppSection>
      </div>

      <!-- Right -->
      <div class="space-y-6">
        <AppSection title="Characteristics">
          <div class="space-y-4">
            <!-- Gender selection -->
            <UFormField
              label="Gender"
              name="gender">
              <USelect
                v-model="state.gender"
                :items="genderItems" />
            </UFormField>

            <!-- Coat type -->
            <UFormField
              label="Coat Type"
              name="coatType">
              <UInput v-model="state.coatType" />
            </UFormField>
          </div>
        </AppSection>

        <!-- Notes -->
        <AppSection title="Notes">
          <UFormField name="specialNotes">
            <UTextarea v-model="state.specialNotes" />
          </UFormField>
        </AppSection>
      </div>
    </div>

    <div class="flex justify-end gap-2 mt-6">
      <UButton
        to="/me/pets"
        variant="ghost"
        label="Cancel" />
      <UButton
        type="submit"
        :loading="loading"
        :disabled="!isCreate && !pageSave?.isDirty.value"
        :label="isCreate ? 'Add Pet' : 'Save'" />
    </div>
  </UForm>
</template>
