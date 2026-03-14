<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { createPetSchema, type CreatePetInput } from '~~/shared/schemas/pet';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const state = reactive<Partial<CreatePetInput>>({
  name: undefined,
  breed: undefined,
  weightLbs: undefined,
  dateOfBirth: undefined,
  gender: undefined,
  coatType: undefined,
  specialNotes: undefined,
});

const genderItems = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];

const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<CreatePetInput>) {
  error.value = null;
  loading.value = false;

  try {
    await $fetch('/api/pets', { method: 'POST', body: event.data });
    await navigateTo('/me/pets');
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to add pet';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg">
    <h1 class="text-2xl font-bold mb-6">Add Pet</h1>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4" />

    <UForm
      :schema="createPetSchema"
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

      <!-- Breed -->
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
          Add Pet
        </UButton>
      </div>
    </UForm>
  </div>
</template>
