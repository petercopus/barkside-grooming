<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'role:manage',
});

const route = useRoute();
const toast = useToast();
const confirm = useConfirmDialog();
const roleId = Number(route.params.id);

const { data: roleData } = await useFetch(`/api/admin/roles/${roleId}`);

if (!roleData.value?.role) {
  throw createError({ statusCode: 404, message: 'Role not found' });
}

const role = roleData.value.role;

const initialValues = {
  name: role.name,
  description: role.description,
  permissionIds: role.permissionIds,
  inheritedPermissionIds: role.inheritedPermissionIds,
  defaultServiceIds: role.defaultServiceIds,
  parentRoleId: role.parentRoleId,
  hasAllPermissions: role.hasAllPermissions,
};

async function onDelete() {
  const confirmed = await confirm({
    title: 'Delete role?',
    description: 'This action cannot be undone. Roles assigned to users cannot be deleted.',
    confirmLabel: 'Delete',
    confirmColor: 'error',
  });

  if (!confirmed) return;

  try {
    await $fetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' });
    toast.add({ title: 'Role deleted', color: 'success' });
    await navigateTo('/admin/settings/roles');
  } catch (e: any) {
    toast.add({
      title: 'Cannot delete',
      description: e.data?.message ?? e.message ?? 'Something went wrong',
      color: 'error',
    });
  }
}
</script>

<template>
  <RolesEditLayout
    mode="edit"
    :title="role.name"
    back-to="/admin/settings/roles"
    :initial-values="initialValues"
    :role-id="roleId">
    <template
      v-if="!role.isSystem"
      #extra-actions>
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        label="Delete"
        size="sm"
        @click="onDelete" />
    </template>
  </RolesEditLayout>
</template>
