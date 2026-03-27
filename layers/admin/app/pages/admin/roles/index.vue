<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'role:manage',
});

const { data, status } = await useFetch('/api/admin/roles');

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.roles ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/roles/${row.original.id}/edit`);
}

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'isSystem', header: 'System' },
];
</script>

<template>
  <div>
    <AppPageHeader
      title="Roles"
      description="Manage roles, permissions, and default service qualifications" />

    <div class="py-4">
      <AppTable
        card="default"
        title="All Roles"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :on-select="onRowSelect"
        empty-icon="i-lucide-shield"
        empty-title="No roles found"
        empty-description="Add your first role to get started."
        empty-action-label="Add Role"
        empty-action-icon="i-lucide-plus"
        @empty-action="navigateTo('/admin/roles/new')">
        <template #actions>
          <UButton
            to="/admin/roles/new"
            icon="i-lucide-plus"
            label="Add Role"
            size="sm" />
        </template>

        <!-- system badge -->
        <template #isSystem-cell="{ row }">
          <UBadge
            v-if="row.original.isSystem"
            color="neutral"
            variant="subtle">
            System
          </UBadge>
        </template>
      </AppTable>
    </div>
  </div>
</template>
