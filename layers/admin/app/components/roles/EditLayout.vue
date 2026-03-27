<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { createRoleSchema, updateRoleSchema, type CreateRoleInput } from '~~/shared/schemas/role';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  roleId?: number;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createRoleSchema : updateRoleSchema));

const { data: permissionsData } = await useFetch('/api/admin/permissions');
const { data: servicesData } = await useFetch('/api/admin/services');

/* ─────────────────────────────────── *
 *  Form State
 * ─────────────────────────────────── */
const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  description: (props.initialValues?.description as string) ?? undefined,
});

const selectedPermissionIds = ref<number[]>((props.initialValues?.permissionIds as number[]) ?? []);
const selectedDefaultServiceIds = ref<number[]>(
  (props.initialValues?.defaultServiceIds as number[]) ?? [],
);

function togglePermission(id: number) {
  const idx = selectedPermissionIds.value.indexOf(id);
  if (idx === -1) selectedPermissionIds.value.push(id);
  else selectedPermissionIds.value.splice(idx, 1);
}

function toggleDefaultService(id: number) {
  const idx = selectedDefaultServiceIds.value.indexOf(id);
  if (idx === -1) selectedDefaultServiceIds.value.push(id);
  else selectedDefaultServiceIds.value.splice(idx, 1);
}

/* ─────────────────────────────────── *
 *  Create Mode
 * ─────────────────────────────────── */
const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/roles/${res.role.id}/edit`,
    })
  : null;

/* ─────────────────────────────────── *
 *  Edit Mode
 * ─────────────────────────────────── */
const pageSave = !isCreate.value
  ? usePageSave({
      sections: {
        details: {
          track: () => ({
            name: state.name,
            description: state.description,
            permissionIds: [...selectedPermissionIds.value].sort(),
            defaultServiceIds: [...selectedDefaultServiceIds.value].sort(),
          }),
          save: (data) =>
            $fetch(`/api/admin/roles/${props.roleId}`, { method: 'PATCH', body: data }),
        },
      },
      successMessage: 'Role updated',
    })
  : null;

/* ─────────────────────────────────── *
 *  Submit
 * ─────────────────────────────────── */
const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    const body = {
      ...(event.data as CreateRoleInput),
      permissionIds: selectedPermissionIds.value,
      defaultServiceIds: selectedDefaultServiceIds.value,
    };

    create!.execute(() => $fetch('/api/admin/roles', { method: 'POST', body }));
  } else {
    pageSave!.submit();
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    @submit="onSubmit">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] items-start gap-6">
      <!-- Left -->
      <div class="space-y-6">
        <AppSection :error="error">
          <div class="space-y-4">
            <!-- Name -->
            <UFormField
              label="Name"
              name="name"
              required>
              <UInput v-model="state.name" />
            </UFormField>

            <!-- Description -->
            <UFormField
              label="Description"
              name="description">
              <UTextarea v-model="state.description" />
            </UFormField>
          </div>
        </AppSection>

        <!-- Permissions -->
        <AppSection title="Permissions">
          <div class="space-y-2 max-h-80 overflow-y-auto">
            <div
              v-for="perm in permissionsData?.permissions ?? []"
              :key="perm.id"
              class="flex items-center gap-2">
              <UCheckbox
                :label="perm.key"
                :model-value="selectedPermissionIds.includes(perm.id)"
                @update:model-value="togglePermission(perm.id)" />
            </div>
          </div>
        </AppSection>
      </div>

      <!-- Right -->
      <div class="space-y-6">
        <!-- Default Service Qualifications -->
        <AppSection title="Default Services">
          <p class="text-sm text-muted mb-3">
            Services auto-assigned to employees when given this role.
          </p>
          <div class="space-y-2">
            <div
              v-for="service in servicesData?.services ?? []"
              :key="service.id"
              class="flex items-center gap-2">
              <UCheckbox
                :label="service.name"
                :model-value="selectedDefaultServiceIds.includes(service.id)"
                @update:model-value="toggleDefaultService(service.id)" />
              <UBadge
                v-if="service.isAddon"
                variant="subtle"
                size="sm">
                addon
              </UBadge>
            </div>
          </div>
        </AppSection>
      </div>
    </div>

    <div class="flex justify-end gap-2 mt-6">
      <UButton
        to="/admin/roles"
        variant="ghost"
        label="Cancel" />
      <UButton
        type="submit"
        :loading="loading"
        :disabled="!isCreate && !pageSave?.isDirty.value"
        :label="isCreate ? 'Create' : 'Save'" />
    </div>
  </UForm>
</template>
