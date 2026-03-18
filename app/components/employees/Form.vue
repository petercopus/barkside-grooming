<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import type { ZodType } from 'zod';
import type { CreateEmployeeInput, UpdateEmployeeInput } from '~~/shared/schemas/employee';

const props = defineProps<{
  schema: ZodType;
  initialValues?: Record<string, unknown>;
  loading?: boolean;
  submitLabel?: string;
  showCredentials?: boolean;
}>();

const emit = defineEmits<{
  submit: [data: CreateEmployeeInput | UpdateEmployeeInput];
}>();

const { data: rolesData } = await useFetch('/api/roles');

const state = reactive({
  email: (props.initialValues?.email as string) ?? undefined,
  password: (props.initialValues?.password as string) ?? undefined,
  firstName: (props.initialValues?.firstName as string) ?? undefined,
  lastName: (props.initialValues?.lastName as string) ?? undefined,
  phone: (props.initialValues?.phone as string) ?? undefined,
  isActive: (props.initialValues?.isActive as boolean) ?? true,
  roleIds: (props.initialValues?.roleIds as number[]) ?? [],
});

function toggleRole(roleId: number) {
  const idx = state.roleIds.indexOf(roleId);
  if (idx === -1) state.roleIds.push(roleId);
  else state.roleIds = state.roleIds.filter((id) => id !== roleId);
}

function onSubmit(event: FormSubmitEvent<unknown>) {
  emit('submit', event.data as CreateEmployeeInput | UpdateEmployeeInput);
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    @submit="onSubmit"
    class="space-y-4">
    <!-- Create only -->
    <template v-if="showCredentials">
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
    </template>

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

    <!-- Edit only -->
    <UFormField
      v-if="initialValues"
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
          @update:model-value="toggleRole(role.id)" />
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
        :label="submitLabel ?? 'Save'" />
    </div>
  </UForm>
</template>
