<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { updatePetSchema, type UpdatePetInput } from '~~/shared/schemas/pet';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const route = useRoute();
const petId = route.params.id as string;

const { data } = await useFetch(`/api/pets/${petId}`);

if (!data.value?.pet) {
  throw createError({ statusCode: 404, message: 'Pet not found' });
}

const pet = data.value.pet;
const state = reactive<Partial<UpdatePetInput>>({
  name: pet.name,
  breed: pet.breed ?? undefined,
  weightLbs: pet.weightLbs ?? undefined,
  dateOfBirth: pet.dateOfBirth ?? undefined,
  gender: pet.gender ?? undefined,
  coatType: pet.coatType ?? undefined,
  specialNotes: pet.specialNotes ?? undefined,
});

const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<UpdatePetInput>) {
  error.value = null;
  loading.value = true;

  try {
    await $fetch(`/api/pets/${petId}`, { method: 'PATCH', body: event.data });
    await navigateTo('/me/pets');
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to update pet';
  } finally {
    loading.value = false;
  }
}

// TODO: extract to shared const. used across multiple files
const genderItems = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
];
</script>

<template>
  <!-- TODO: Major duplication w/ form across edit/new pet pages. Extract to reusable component -->
  <div class="max-w-lg">
    <h1 class="text-2xl font-bold mb-6">Edit {{ pet.name }}</h1>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4" />

    <UForm
      :schema="updatePetSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit">
      <!-- Name -->
      <UFormField
        label="Name"
        name="name">
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
          Save Changes
        </UButton>
      </div>
    </UForm>
  </div>
</template>
