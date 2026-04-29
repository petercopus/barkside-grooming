<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});

const { data, status } = await useFetch('/api/admin/bundles');

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.bundles ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/settings/bundles/${row.original.id}/edit`);
}

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'discountType', header: 'Discount Type' },
  { accessorKey: 'discountValue', header: 'Discount' },
  { accessorKey: 'serviceIds', header: 'Services' },
  { accessorKey: 'isActive', header: 'Status' },
];
</script>

<template>
  <AppPage
    title="Bundles"
    description="Manage promotional service bundles"
    width="wide">
    <AppTable
      card="default"
      title="All Bundles"
      :columns="columns"
      :data="rows"
      :loading="loading"
      :on-select="onRowSelect"
      empty-icon="i-lucide-package"
      empty-title="No bundles found"
      empty-description="Create your first bundle to offer discounts on service combinations."
      empty-action-label="Add Bundle"
      empty-action-icon="i-lucide-plus"
      @empty-action="navigateTo('/admin/settings/bundles/new')">
      <template #actions>
        <UButton
          to="/admin/settings/bundles/new"
          icon="i-lucide-plus"
          label="Add Bundle"
          size="sm" />
      </template>

      <!-- Discount type display -->
      <template #discountType-cell="{ row }">
        {{ discountTypeLabel[row.original.discountType as string] ?? row.original.discountType }}
      </template>

      <!-- Discount display -->
      <template #discountValue-cell="{ row }">
        {{
          row.original.discountType === 'percent'
            ? `${row.original.discountValue}%`
            : formatCurrency(row.original.discountValue as number)
        }}
      </template>

      <!-- Service count -->
      <template #serviceIds-cell="{ row }">
        {{ (row.original as any).serviceIds.length }}
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
