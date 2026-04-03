<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'customer:read',
});

const searchQuery = ref('');
const debouncedSearch = ref('');

let timeout: ReturnType<typeof setTimeout>;
watch(searchQuery, (val) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    debouncedSearch.value = val;
  }, 300);
});

const { data, status } = await useFetch('/api/admin/customers', {
  params: computed(() => ({
    search: debouncedSearch.value || undefined,
  })),
});

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.customers ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/customers/${row.original.id}`);
}

const columns = [
  { accessorKey: 'firstName', header: 'First Name' },
  { accessorKey: 'lastName', header: 'Last Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' },
  { accessorKey: 'petCount', header: 'Pets' },
  { accessorKey: 'lastAppointment', header: 'Last Appointment' },
];
</script>

<template>
  <div>
    <AppPageHeader
      title="Customers"
      description="View and manage customer accounts" />

    <div class="py-4">
      <AppTable
        card="default"
        title="All Customers"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :on-select="onRowSelect"
        empty-icon="i-lucide-contact"
        empty-title="No customers found"
        empty-description="No customers match the current search.">
        <template #actions>
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search customers..."
            size="sm"
            class="w-64" />
        </template>

        <!-- pet count -->
        <template #petCount-cell="{ row }: any">
          <UBadge variant="subtle">
            {{ row.original.petCount }}
          </UBadge>
        </template>

        <!-- last appt -->
        <template #lastAppointment-cell="{ row }: any">
          {{
            row.original.lastAppointment
              ? new Date(row.original.lastAppointment).toLocaleDateString()
              : 'Never'
          }}
        </template>
      </AppTable>
    </div>
  </div>
</template>
