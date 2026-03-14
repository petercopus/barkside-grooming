<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import type { ZodType } from 'zod';
import type { CreatePetInput, UpdatePetInput } from '~~/shared/schemas/pet';

const props = defineProps<{
  schema: ZodType;
  initialValues?: Record<string, unknown>;
  loading?: boolean;
  submitLabel?: string;
}>();

const emit = defineEmits<{
  submit: [data: CreatePetInput | UpdatePetInput];
}>();

const state = reactive<Partial<CreatePetInput>>({
  name: (props.initialValues?.name as string) ?? undefined,
  breed: (props.initialValues?.breed as string) ?? undefined,
  weightLbs: (props.initialValues?.weightLbs as number) ?? undefined,
  dateOfBirth: (props.initialValues?.dateOfBirth as string) ?? undefined,
  gender: (props.initialValues?.gender as CreatePetInput['gender']) ?? undefined,
  coatType: (props.initialValues?.coatType as string) ?? undefined,
  specialNotes: (props.initialValues?.specialNotes as string) ?? undefined,
});

const genderItems = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

function onSubmit(event: FormSubmitEvent<unknown>) {
  emit('submit', event.data as CreatePetInput | UpdatePetInput);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-4"
    @submit="onSubmit">
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

    <!-- DOB -->
    <!-- TODO: use @internationalized/date package? Can use UInputDate component -->
    <UFormField
      label="Date of Birth"
      name="dateOfBirth">
      <UInput
        v-model="state.dateOfBirth"
        type="date" />
    </UFormField>

    <!-- Gender -->
    <UFormField
      label="Gender"
      name="gender">
      <USelect
        v-model="state.gender"
        :items="genderItems" />
    </UFormField>

    <!-- Coat Type -->
    <UFormField
      label="Coat Type"
      name="coatType">
      <UInput v-model="state.coatType" />
    </UFormField>

    <!-- Special Notes -->
    <UFormField
      label="Special Notes"
      name="specialNotes">
      <UTextarea v-model="state.specialNotes" />
    </UFormField>

    <div class="flex justify-end gap-3 pt-2">
      <UButton
        to="/me/pets"
        variant="outline">
        Cancel
      </UButton>
      <UButton
        type="submit"
        :loading="loading">
        {{ submitLabel ?? 'Save' }}
      </UButton>
    </div>
  </UForm>
</template>
