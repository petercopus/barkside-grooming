<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
} from '~~/shared/schemas/employee';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  employeeId?: string;
  title: string;
  backTo: string;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createEmployeeSchema : updateEmployeeSchema));

const { data: servicesData } = await useFetch('/api/admin/services');
const { data: rolesData } = await useFetch('/api/admin/roles');

const state = reactive({
  email: (props.initialValues?.email as string) ?? undefined,
  password: undefined as string | undefined,
  firstName: (props.initialValues?.firstName as string) ?? undefined,
  lastName: (props.initialValues?.lastName as string) ?? undefined,
  phone: (props.initialValues?.phone as string) ?? undefined,
  isActive: (props.initialValues?.isActive as boolean) ?? true,
  roleIds: (props.initialValues?.roleIds as number[]) ?? [],
  serviceIds: [...((props.initialValues?.serviceIds as number[]) ?? [])],
});

const roleItems = computed(() =>
  (rolesData.value?.roles ?? []).map((role) => ({
    label: role.name,
    id: role.id,
  })),
);

function toggleService(serviceId: number) {
  toggleArrayItem(state.serviceIds, serviceId);
}

const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/employees/${res.employee.id}/edit`,
    })
  : null;

const pageSave = !isCreate.value
  ? usePageSave({
      sections: {
        details: {
          track: () => ({
            email: state.email,
            firstName: state.firstName,
            lastName: state.lastName,
            phone: state.phone,
            isActive: state.isActive,
            roleIds: [...state.roleIds].sort(),
          }),
          save: (data) =>
            $fetch(`/api/admin/employees/${props.employeeId}`, { method: 'PATCH', body: data }),
        },
        services: {
          track: () => [...state.serviceIds].sort(),
          save: (serviceIds) =>
            $fetch(`/api/admin/employees/${props.employeeId}/services`, {
              method: 'PUT',
              body: { serviceIds },
            }),
        },
      },
      successMessage: 'Employee updated',
    })
  : null;

const { discardChanges } = useDiscardable(state, pageSave);

const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    const body = {
      ...(event.data as CreateEmployeeInput),
      serviceIds: state.serviceIds,
    };

    create!.execute(() => $fetch('/api/admin/employees', { method: 'POST', body }));
  } else {
    pageSave!.submit();
  }
}
</script>

<template>
  <AppFormLayout
    :title="title"
    :back-to="backTo"
    form-id="employee-edit-form"
    :schema="schema"
    :state="state"
    :mode="mode"
    :loading="loading"
    :is-dirty="pageSave?.isDirty.value ?? false"
    @submit="onSubmit"
    @discard="discardChanges">
    <template
      v-if="$slots['extra-actions']"
      #extra-actions>
      <slot name="extra-actions" />
    </template>

    <AppSection :error="error">
      <div class="space-y-4">
        <UFormField
          label="Email"
          name="email">
          <UInput
            v-model="state.email"
            type="email" />
        </UFormField>

        <UFormField
          v-if="isCreate"
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
      </div>
    </AppSection>

    <template #sidebar>
      <AppSection title="Status">
        <UFormField name="isActive">
          <USwitch
            v-model="state.isActive"
            label="Active" />
        </UFormField>
      </AppSection>

      <AppSection title="Roles">
        <UFormField name="roleIds">
          <UCheckboxGroup
            v-model="state.roleIds"
            value-key="id"
            :items="roleItems" />
        </UFormField>
      </AppSection>

      <AppSection title="Service Qualifications">
        <div class="space-y-2">
          <div
            v-for="service in servicesData?.services ?? []"
            :key="service.id"
            class="flex items-center gap-2">
            <UCheckbox
              :label="service.name"
              :model-value="state.serviceIds.includes(service.id)"
              @update:model-value="toggleService(service.id)" />
            <UBadge
              v-if="service.isAddon"
              variant="subtle"
              size="sm">
              addon
            </UBadge>
          </div>
        </div>
      </AppSection>
    </template>
  </AppFormLayout>
</template>
