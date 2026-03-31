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
const { data: rolesData } = await useFetch('/api/admin/roles');

// exclude current role from parent options
const parentRoleOptions = computed(() =>
  (rolesData.value?.roles ?? [])
    .filter((r: any) => r.id !== props.roleId)
    .map((r: any) => ({ label: r.name, id: r.id })),
);

/* ─────────────────────────────────── *
 *  Form State
 * ─────────────────────────────────── */
const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  description: (props.initialValues?.description as string) ?? undefined,
  parentRoleId: (props.initialValues?.parentRoleId as number | null) ?? null,
  hasAllPermissions: (props.initialValues?.hasAllPermissions as boolean) ?? false,
  permissionIds: [...((props.initialValues?.permissionIds as number[]) ?? [])],
  defaultServiceIds: [...((props.initialValues?.defaultServiceIds as number[]) ?? [])],
});

// Read-only display data — not form state
const inheritedPermissionIds = ref<number[]>(
  (props.initialValues?.inheritedPermissionIds as number[]) ?? [],
);

function isInherited(permId: number) {
  return inheritedPermissionIds.value.includes(permId);
}

function togglePermission(id: number) {
  if (isInherited(id)) return;
  toggleArrayItem(state.permissionIds, id);
}

function toggleDefaultService(id: number) {
  toggleArrayItem(state.defaultServiceIds, id);
}

/* ─────────────────────────────────── *
 *  Create Mode
 * ─────────────────────────────────── */
const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/roles/${res.role.id}/edit`,
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
            parentRoleId: state.parentRoleId,
            hasAllPermissions: state.hasAllPermissions,
            permissionIds: [...state.permissionIds].sort(),
            defaultServiceIds: [...state.defaultServiceIds].sort(),
          }),
          save: (data) =>
            $fetch(`/api/admin/roles/${props.roleId}`, { method: 'PATCH', body: data }),
        },
      },
      successMessage: 'Role updated',
    })
  : null;

const { discardChanges } = useDiscardable(state, pageSave);

/* ─────────────────────────────────── *
 *  Submit
 * ─────────────────────────────────── */
const loading = computed(() => (isCreate.value ? create!.loading.value : pageSave!.loading.value));
const error = computed(() => (isCreate.value ? create!.error.value : pageSave!.error.value));

function onSubmit(event: FormSubmitEvent<unknown>) {
  if (isCreate.value) {
    const body = {
      ...(event.data as CreateRoleInput),
      permissionIds: state.permissionIds,
      defaultServiceIds: state.defaultServiceIds,
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

            <!-- Parent Role -->
            <UFormField
              label="Inherits From"
              name="parentRoleId">
              <USelectMenu
                v-model="state.parentRoleId"
                :items="parentRoleOptions"
                placeholder="None"
                value-key="id" />
            </UFormField>
          </div>
        </AppSection>

        <!-- Permissions -->
        <AppSection title="Permissions">
          <div
            v-if="state.hasAllPermissions"
            class="text-sm text-muted">
            This role has full system access.
          </div>
          <div
            v-else
            class="space-y-2 max-h-80 overflow-y-auto">
            <div
              v-for="perm in permissionsData?.permissions ?? []"
              :key="perm.id"
              class="flex items-center gap-2">
              <UCheckbox
                :label="perm.key"
                :model-value="isInherited(perm.id) || state.permissionIds.includes(perm.id)"
                :disabled="isInherited(perm.id)"
                @update:model-value="togglePermission(perm.id)" />
            </div>
          </div>
        </AppSection>
      </div>

      <!-- Right -->
      <div class="space-y-6">
        <!-- Access Level -->
        <AppSection title="Access Level">
          <USwitch
            v-model="state.hasAllPermissions"
            label="Full access (all permissions)" />
        </AppSection>

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
                :model-value="state.defaultServiceIds.includes(service.id)"
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
        v-if="isCreate"
        to="/admin/settings/roles"
        variant="ghost"
        label="Cancel" />
      <UButton
        v-else-if="pageSave?.isDirty.value"
        variant="ghost"
        label="Discard"
        @click="discardChanges" />
      <UButton
        type="submit"
        :loading="loading"
        :disabled="!isCreate && !pageSave?.isDirty.value"
        :label="isCreate ? 'Create' : 'Save'" />
    </div>
  </UForm>
</template>
