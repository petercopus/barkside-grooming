<script setup lang="ts">
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from '~~/shared/schemas/employee';

definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'employee:manage',
});

const loading = ref(false);
const error = ref('');

async function onSubmit(data: CreateEmployeeInput | UpdateEmployeeInput) {
  loading.value = true;
  error.value = '';

  try {
    const res = await $fetch('/api/employees', {
      method: 'POST',
      body: data,
    });

    await navigateTo(`/employee/employees/${res.employee.id}/edit`);
  } catch (e: any) {
    error.value = e.data?.message ?? 'Failed to create employee';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Add Employee</h1>

    <UAlert
      v-if="error"
      color="error"
      :title="error"
      class="mb-4" />

    <EmployeesForm
      :schema="createEmployeeSchema"
      :loading="loading"
      show-credentials
      submit-label="Create"
      @submit="onSubmit" />
  </div>
</template>
