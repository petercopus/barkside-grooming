<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'pet:read:all',
});

const { data, status } = await useFetch('/api/admin/pets');

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.pets ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/pets/${row.original.id}`);
}

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'breed', header: 'Breed' },
  { accessorKey: 'weightLbs', header: 'Weight (lbs)' },
  { accessorKey: 'owner', header: 'Owner' },
  { accessorKey: 'gender', header: 'Gender' },
  { accessorKey: 'coatType', header: 'Coat Type' },
];
</script>

<template>
  <div>
    <AppPageHeader
      title="Pets"
      description="All registered pets" />

    <div class="py-4">
      <AppTable
        card="default"
        title="All Pets"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :on-select="onRowSelect"
        empty-icon="i-lucide-paw-print"
        empty-title="No pets found">
        <!-- owner -->
        <template #owner-cell="{ row }: any">
          <NuxtLink
            :to="`/admin/customers/${row.original.ownerId}`"
            class="text-primary hover:underline"
            @click.stop>
            {{ row.original.ownerFirstName }} {{ row.original.ownerLastName }}
          </NuxtLink>
        </template>
      </AppTable>
    </div>
  </div>
</template>
