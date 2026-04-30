<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});

const { data, status } = await useFetch('/api/admin/services');

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.services ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/settings/services/${row.original.id}/edit`);
}
const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'isAddon', header: 'Addon' },
  { accessorKey: 'isActive', header: 'Status' },
  { accessorKey: 'sortOrder', header: 'Order' },
];
</script>

<template>
  <AppPage
    title="Services"
    description="Manage services, addons, and bundles"
    width="wide">
    <AppTable
      card="default"
      title="All Services"
      :columns="columns"
      :data="rows"
      :loading="loading"
      :on-select="onRowSelect"
      empty-icon="i-lucide-scissors"
      empty-title="No services found"
      empty-description="Add your first service to get started."
      empty-action-label="Add Service"
      empty-action-icon="i-lucide-plus"
      @empty-action="navigateTo('/admin/settings/services/new')">
      <template #actions>
        <UButton
          to="/admin/settings/services/new"
          icon="i-lucide-plus"
          label="Add Service"
          size="sm" />
      </template>

      <!-- Addon -->
      <template #isAddon-cell="{ row }">
        <UBadge
          v-if="row.original.isAddon"
          color="info">
          Addon
        </UBadge>
        <span
          v-else
          class="text-muted">
          —
        </span>
      </template>

      <!-- Status badge -->
      <template #isActive-cell="{ row }">
        <AppStatusBadge
          kind="active"
          :value="!!row.original.isActive" />
      </template>
    </AppTable>
  </AppPage>
</template>
