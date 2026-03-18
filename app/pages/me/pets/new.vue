<script setup lang="ts">
import { createPetSchema, type CreatePetInput, type UpdatePetInput } from '~~/shared/schemas/pet';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(data: CreatePetInput | UpdatePetInput) {
  error.value = null;
  loading.value = true;

  try {
    await $fetch('/api/pets', { method: 'POST', body: data });
    await navigateTo('/me/pets');
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to add pet';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Add Pet</h1>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4" />

    <PetsForm
      :schema="createPetSchema"
      :loading="loading"
      submit-label="Add Pet"
      @submit="onSubmit" />
  </div>
</template>
