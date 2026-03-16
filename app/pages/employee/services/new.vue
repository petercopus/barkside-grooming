<script setup lang="ts">
import {
  createServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from '~~/shared/schemas/service';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
  permission: 'service:manage',
});

const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(data: CreateServiceInput | UpdateServiceInput) {
  error.value = null;
  loading.value = true;

  try {
    const result = await $fetch('/api/services', { method: 'POST', body: data });
    if (!result || !result.service) return;

    // redirect after creation to set pricing etc
    await navigateTo(`/employee/services/${result.service.id}/edit`);
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to create service';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg">
    <h1 class="text-2xl font-bold mb-6">Add Service</h1>
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4" />

    <ServicesForm
      :schema="createServiceSchema"
      :loading="loading"
      submit-label="Create"
      @submit="onSubmit" />
  </div>
</template>
