<script setup lang="ts">
import {
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type UpdateEmployeeInput,
} from '~~/shared/schemas/employee';

definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'employee:manage',
});

const route = useRoute();
const id = route.params.id as string;

const { data: empData, refresh } = await useFetch(`/api/employees/${id}`);
const { data: servicesData } = await useFetch('/api/services');

if (!empData.value?.employee) {
  throw createError({ statusCode: 404, message: 'Employee not found' });
}

const employee = {
  firstName: empData.value.employee.firstName,
  lastName: empData.value.employee.lastName,
  phone: empData.value.employee.phone,
  isActive: empData.value.employee.isActive,
  roleIds: empData.value.employee.roles.map((r) => r.id),
};

const error = ref<string | null>(null);
const success = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(data: CreateEmployeeInput | UpdateEmployeeInput) {
  error.value = null;
  success.value = null;
  loading.value = true;

  try {
    await $fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      body: data,
    });

    success.value = 'Employee updated';

    await refresh();
  } catch (e: any) {
    error.value = e.data?.message ?? 'Failed to update';
  } finally {
    loading.value = false;
  }
}

// Service qualifications
const selectedServiceIds = ref<number[]>(empData.value?.employee.serviceIds ?? []);
const servicesSuccess = ref<string | null>(null);
const servicesLoading = ref(false);

async function saveServices() {
  servicesSuccess.value = '';
  servicesLoading.value = true;

  try {
    await $fetch(`/api/employees/${id}/services`, {
      method: 'PUT',
      body: { serviceIds: selectedServiceIds.value },
    });

    servicesSuccess.value = 'Service qualifications updated';
  } catch (e: any) {
    error.value = e.data?.message ?? 'Failed to update services';
  } finally {
    servicesLoading.value = false;
  }
}

function toggleService(serviceId: number) {
  const idx = selectedServiceIds.value.indexOf(serviceId);
  if (idx === -1) selectedServiceIds.value.push(serviceId);
  else selectedServiceIds.value.splice(idx, 1);
}
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-bold">Edit Employee</h1>

    <!-- Details and role -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Details & Roles</h2>
      </template>

      <UAlert
        v-if="error"
        color="error"
        :title="error"
        class="mb-4" />

      <UAlert
        v-if="success"
        color="success"
        :title="success"
        class="mb-4" />

      <EmployeesForm
        :schema="updateEmployeeSchema"
        :initial-values="employee"
        :loading="loading"
        submit-label="Save"
        @submit="onSubmit" />
    </UCard>

    <!-- Services -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Service Qualifications</h2>
      </template>

      <UAlert
        v-if="servicesSuccess"
        color="success"
        :title="servicesSuccess"
        class="mb-4" />

      <div class="space-y-2 mb-4">
        <div
          v-for="service in servicesData?.services ?? []"
          :key="service.id"
          class="flex items-center gap-2">
          <UCheckbox
            :label="service.name"
            :model-value="selectedServiceIds.includes(service.id)"
            @update:model-value="toggleService(service.id)" />
          <UBadge
            v-if="service.isAddon"
            variant="subtle"
            size="sm">
            addon
          </UBadge>
        </div>
      </div>

      <UButton
        :loading="servicesLoading"
        label="Save"
        @click="saveServices" />
    </UCard>
  </div>
</template>
