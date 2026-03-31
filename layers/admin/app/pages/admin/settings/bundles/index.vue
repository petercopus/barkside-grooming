<script setup lang="ts">
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
  <div>
    <AppPageHeader
      title="Bundles"
      description="Manage promotional service bundles" />

    <div class="py-4">
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

        <!-- Discount display -->
        <template #discountValue-cell="{ row }">
          {{
            row.original.discountType === 'percent'
              ? `${row.original.discountValue}%`
              : `$${formatCents(row.original.discountValue as number)}`
          }}
        </template>

        <!-- Service count -->
        <template #serviceIds-cell="{ row }">
          {{ (row.original as any).serviceIds.length }}
        </template>

        <!-- Status badge -->
        <template #isActive-cell="{ row }">
          <UBadge :color="row.original.isActive ? 'success' : 'neutral'">
            {{ row.original.isActive ? 'Active' : 'Inactive' }}
          </UBadge>
        </template>
      </AppTable>
    </div>
  </div>
</template>
