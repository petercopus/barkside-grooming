<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { createRoleSchema, updateRoleSchema, type CreateRoleInput } from '~~/shared/schemas/role';

const props = defineProps<{
  mode: 'create' | 'edit';
  initialValues?: Record<string, unknown>;
  roleId?: number;
  title: string;
  backTo: string;
  readOnly?: boolean;
}>();

const isCreate = computed(() => props.mode === 'create');
const schema = computed(() => (isCreate.value ? createRoleSchema : updateRoleSchema));

const { data: permissionsData } = await useFetch('/api/admin/permissions');
const { data: servicesData } = await useFetch('/api/admin/services');
const { data: rolesData } = await useFetch('/api/admin/roles');

const parentRoleOptions = computed(() =>
  (rolesData.value?.roles ?? [])
    .filter((r: any) => r.id !== props.roleId)
    .map((r: any) => ({ label: r.name, id: r.id })),
);

const state = reactive({
  name: (props.initialValues?.name as string) ?? undefined,
  description: (props.initialValues?.description as string) ?? undefined,
  parentRoleId: (props.initialValues?.parentRoleId as number | null) ?? null,
  hasAllPermissions: (props.initialValues?.hasAllPermissions as boolean) ?? false,
  permissionIds: [...((props.initialValues?.permissionIds as number[]) ?? [])],
  defaultServiceIds: [...((props.initialValues?.defaultServiceIds as number[]) ?? [])],
});

const inheritedPermissionIds = ref<number[]>(
  (props.initialValues?.inheritedPermissionIds as number[]) ?? [],
);

const inheritedDefaultServiceIds = ref<number[]>(
  (props.initialValues?.inheritedDefaultServiceIds as number[]) ?? [],
);

// when parent role changes, refetch the parent's full perm/service set
watch(
  () => state.parentRoleId,
  async (parentId, oldParentId) => {
    if (parentId === oldParentId) return;

    if (!parentId) {
      inheritedPermissionIds.value = [];
      inheritedDefaultServiceIds.value = [];

      return;
    }

    try {
      const res = await $fetch<{ role: any }>(`/api/admin/roles/${parentId}`);

      const perms = new Set<number>([
        ...(res.role.permissionIds ?? []),
        ...(res.role.inheritedPermissionIds ?? []),
      ]);

      const services = new Set<number>([
        ...(res.role.defaultServiceIds ?? []),
        ...(res.role.inheritedDefaultServiceIds ?? []),
      ]);

      inheritedPermissionIds.value = [...perms];
      inheritedDefaultServiceIds.value = [...services];
    } catch {
      inheritedPermissionIds.value = [];
      inheritedDefaultServiceIds.value = [];
    }
  },
);

function isInheritedPerm(permId: number) {
  return inheritedPermissionIds.value.includes(permId);
}

function isInheritedService(serviceId: number) {
  return inheritedDefaultServiceIds.value.includes(serviceId);
}

function togglePermission(id: number) {
  if (isInheritedPerm(id)) return;
  toggleArrayItem(state.permissionIds, id);
}

function toggleDefaultService(id: number) {
  if (isInheritedService(id)) return;
  toggleArrayItem(state.defaultServiceIds, id);
}

const create = isCreate.value
  ? useFormAction({
      redirectTo: (res: any) => `/admin/settings/roles/${res.role.id}/edit`,
    })
  : null;

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
  <AppFormLayout
    :title="title"
    :back-to="backTo"
    form-id="role-edit-form"
    :schema="schema"
    :state="state"
    :mode="mode"
    :loading="loading"
    :is-dirty="pageSave?.isDirty.value ?? false"
    @submit="onSubmit"
    @discard="discardChanges">
    <template
      v-if="$slots['extra-actions'] || readOnly"
      #extra-actions>
      <slot name="extra-actions" />
    </template>

    <template
      v-if="readOnly"
      #banner>
      <UAlert
        color="info"
        icon="i-lucide-lock"
        title="System role"
        description="This role is built-in and cannot be edited." />
    </template>

    <AppSection :error="error">
      <fieldset
        :disabled="readOnly"
        class="space-y-4">
        <UFormField
          label="Name"
          name="name"
          required>
          <UInput v-model="state.name" />
        </UFormField>

        <UFormField
          label="Description"
          name="description">
          <UTextarea v-model="state.description" />
        </UFormField>

        <UFormField
          label="Inherits From"
          name="parentRoleId">
          <USelectMenu
            v-model="state.parentRoleId"
            :items="parentRoleOptions"
            placeholder="None"
            value-key="id"
            :ui="{ content: 'min-w-fit' }" />
        </UFormField>
      </fieldset>
    </AppSection>

    <AppSection title="Permissions">
      <div
        v-if="state.hasAllPermissions"
        class="text-sm text-muted">
        This role has full system access.
      </div>
      <fieldset
        v-else
        :disabled="readOnly"
        class="space-y-2 max-h-80 overflow-y-auto">
        <div
          v-for="perm in permissionsData?.permissions ?? []"
          :key="perm.id"
          class="flex items-center gap-2">
          <UCheckbox
            :label="perm.key"
            :model-value="isInheritedPerm(perm.id) || state.permissionIds.includes(perm.id)"
            :disabled="readOnly || isInheritedPerm(perm.id)"
            @update:model-value="togglePermission(perm.id)" />

          <UBadge
            v-if="isInheritedPerm(perm.id)"
            variant="subtle"
            size="sm">
            inherited
          </UBadge>
        </div>
      </fieldset>
    </AppSection>

    <template #sidebar>
      <AppSection title="Access Level">
        <USwitch
          v-model="state.hasAllPermissions"
          :disabled="readOnly"
          label="Full access (all permissions)" />
      </AppSection>

      <AppSection title="Default Services">
        <p class="text-sm text-muted mb-3">
          Services auto-assigned to employees when given this role.
        </p>
        <fieldset
          :disabled="readOnly"
          class="space-y-2">
          <div
            v-for="service in servicesData?.services ?? []"
            :key="service.id"
            class="flex items-center gap-2">
            <UCheckbox
              :label="service.name"
              :model-value="
                isInheritedService(service.id) || state.defaultServiceIds.includes(service.id)
              "
              :disabled="readOnly || isInheritedService(service.id)"
              @update:model-value="toggleDefaultService(service.id)" />

            <UBadge
              v-if="service.isAddon"
              variant="subtle"
              size="sm">
              addon
            </UBadge>

            <UBadge
              v-if="isInheritedService(service.id)"
              variant="subtle"
              size="sm">
              inherited
            </UBadge>
          </div>
        </fieldset>
      </AppSection>
    </template>
  </AppFormLayout>
</template>
