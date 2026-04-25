<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'size-category:manage',
});

const { data, status } = await useFetch('/api/admin/size-categories');

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.categories ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/settings/size-categories/${row.original.id}/edit`);
}

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'minWeight', header: 'Min Weight (lbs)' },
  { accessorKey: 'maxWeight', header: 'Max Weight (lbs)' },
];
</script>

<template>
  <div>
    <AppPageHeader
      title="Size Categories"
      description="Manage pet size categories and weight ranges" />

    <div class="py-4">
      <AppTable
        card="default"
        title="All Size Categories"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :on-select="onRowSelect"
        empty-icon="i-lucide-ruler"
        empty-title="No size categories found"
        empty-description="Add your first size category to get started."
        empty-action-label="Add Size Category"
        empty-action-icon="i-lucide-plus"
        @empty-action="navigateTo('/admin/settings/size-categories/new')">
        <template #actions>
          <UButton
            to="/admin/settings/size-categories/new"
            icon="i-lucide-plus"
            label="Add Size Category"
            size="sm" />
        </template>
      </AppTable>
    </div>
  </div>
</template>
