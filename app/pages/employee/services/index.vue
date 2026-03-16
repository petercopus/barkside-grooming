<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:read',
});

const { data, refresh } = await useFetch('/api/services');

async function deleteService(id: number) {
  if (!confirm('Deactive thi servie?')) return;
  await $fetch(`/api/services/${id}`, { method: 'DELETE' });
  await refresh();
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Services</h1>
      <UButton
        to="/employee/services/new"
        icon="i-lucide-plus">
        Add Service
      </UButton>
    </div>

    <div
      v-if="!data?.services?.length"
      class="text-center py-12 text-muted">
      <p>No services yet.</p>
    </div>

    <UTable
      v-else
      :data="data.services"
      :columns="[
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'category', header: 'Category' },
        { accessorKey: 'isAddon', header: 'Addon' },
        { accessorKey: 'sortOrder', header: 'Order' },
        { accessorKey: 'actions', header: '' },
      ]">
      <template #isAddon-cell="{ row }">
        <UBadge
          v-if="row.original.isAddon"
          color="info"
          >Addon</UBadge
        >
      </template>

      <!-- Active status -->
      <template #isActive-cell="{ row }">
        <UBadge :color="row.original.isActive ? 'success' : 'neutral'">
          {{ row.original.isActive ? 'Active' : 'Inactive' }}
        </UBadge>
      </template>

      <!-- Actions -->
      <template #actions-cell="{ row }">
        <div class="flex gap-2 justify-end">
          <UButton
            :to="`/employee/services/${row.original.id}/edit`"
            variant="ghost"
            size="sm"
            icon="i-lucide-pencil" />

          <UButton
            v-if="row.original.isActive"
            variant="ghost"
            size="sm"
            color="error"
            icon="i-lucide-trash-2"
            @click="deleteService(row.original.id)" />
        </div>
      </template>
    </UTable>
  </div>
</template>
