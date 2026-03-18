<script setup lang="ts">
import { createEmployeeSchema, type CreateEmployeeInput } from '~~/shared/schemas/employee';
import type { FormSubmitEvent } from '@nuxt/ui';

definePageMeta({ layout: 'dashboard', middleware: 'permission', permission: 'employee:manage' });

const { data: rolesData } = await useFetch('/api/roles');

const state = reactive<Partial<CreateEmployeeInput>>({
  email: undefined,
  password: undefined,
  firstName: undefined,
  lastName: undefined,
  phone: undefined,
  roleIds: [],
});

const loading = ref(false);
const error = ref('');

async function onSubmit(event: FormSubmitEvent<CreateEmployeeInput>) {
  loading.value = true;
  error.value = '';
  try {
    const res = await $fetch('/api/employees', {
      method: 'POST',
      body: event.data,
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

    <UForm
      :schema="createEmployeeSchema"
      :state="state"
      @submit="onSubmit"
      class="space-y-4">
      <UFormField
        label="Email"
        name="email">
        <UInput
          v-model="state.email"
          type="email" />
      </UFormField>

      <UFormField
        label="Temporary Password"
        name="password">
        <UInput
          v-model="state.password"
          type="password" />
      </UFormField>

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

      <!-- Role checkboxes -->
      <UFormField
        label="Roles"
        name="roleIds">
        <div class="space-y-2">
          <UCheckbox
            v-for="role in rolesData?.roles ?? []"
            :key="role.id"
            :label="role.name"
            :model-value="state.roleIds?.includes(role.id) ?? false"
            @update:model-value="
              $event
                ? state.roleIds?.push(role.id)
                : (state.roleIds = state.roleIds?.filter((id) => id !== role.id))
            " />
        </div>
      </UFormField>

      <div class="flex gap-2">
        <UButton
          to="/employee/employees"
          variant="ghost"
          label="Cancel" />
        <UButton
          type="submit"
          :loading="loading"
          label="Create Employee" />
      </div>
    </UForm>
  </div>
</template>
