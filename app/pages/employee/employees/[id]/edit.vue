<script setup lang="ts">
import { updateEmployeeSchema, type UpdateEmployeeInput } from '~~/shared/schemas/employee';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({ layout: 'dashboard', middleware: 'permission', permission: 'employee:manage' });

const route = useRoute();
const id = route.params.id as string;

const { data: empData, refresh } = await useFetch(`/api/employees/${id}`);
const { data: rolesData } = await useFetch('/api/roles');
const { data: servicesData } = await useFetch('/api/services');

// Details form
const state = reactive({
  firstName: empData.value?.employee.firstName ?? '',
  lastName: empData.value?.employee.lastName ?? '',
  phone: empData.value?.employee.phone ?? '',
  isActive: empData.value?.employee.isActive ?? true,
  roleIds: empData.value?.employee.roles.map((r: any) => r.id) ?? [],
});

const loading = ref(false);
const error = ref('');
const success = ref('');

async function onSubmit(event: FormSubmitEvent<UpdateEmployeeInput>) {
  loading.value = true;
  error.value = '';
  success.value = '';
  try {
    await $fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      body: event.data,
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
const servicesLoading = ref(false);
const servicesSuccess = ref('');

async function saveServices() {
  servicesLoading.value = true;
  servicesSuccess.value = '';
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

    <!-- ── Details + Roles ── -->
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

      <UForm
        :schema="updateEmployeeSchema"
        :state="state"
        @submit="onSubmit"
        class="space-y-4">
        <UFormField
          label="First Name"
          name="firstName">
          <UInput v-model="state.firstName" />
        </UFormField>

        <UFormField
          label="Last Name"
          name="lastName">
          <UInput v-model="state.lastName" />
        </UFormField>

        <UFormField
          label="Phone"
          name="phone">
          <UInput v-model="state.phone" />
        </UFormField>

        <UFormField
          label="Active"
          name="isActive">
          <USwitch v-model="state.isActive" />
        </UFormField>

        <UFormField
          label="Roles"
          name="roleIds">
          <div class="space-y-2">
            <UCheckbox
              v-for="role in rolesData?.roles ?? []"
              :key="role.id"
              :label="role.name"
              :model-value="state.roleIds.includes(role.id)"
              @update:model-value="
                $event
                  ? state.roleIds.push(role.id)
                  : (state.roleIds = state.roleIds.filter((id: number) => id !== role.id))
              " />
          </div>
        </UFormField>

        <div class="flex gap-2">
          <UButton
            type="submit"
            :loading="loading"
            label="Save" />
        </div>
      </UForm>
    </UCard>

    <!-- ── Service Qualifications ── -->
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
