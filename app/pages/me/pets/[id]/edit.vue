<script setup lang="ts">
import { updatePetSchema, type CreatePetInput, type UpdatePetInput } from '~~/shared/schemas/pet';

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

const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(data: CreatePetInput | UpdatePetInput) {
  error.value = null;
  loading.value = true;

  try {
    await $fetch(`/api/pets/${petId}`, { method: 'PATCH', body: data });
    await navigateTo('/me/pets');
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to update pet';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <!-- TODO: Major duplication w/ form across edit/new pet pages. Extract to reusable component -->
  <div>
    <h1 class="text-2xl font-bold mb-6">Edit {{ pet.name }}</h1>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4" />

    <PetsForm
      v-if="pet"
      :schema="updatePetSchema"
      :initial-values="pet"
      :loading="loading"
      submit-label="Save Changes"
      @submit="onSubmit" />
  </div>
</template>
