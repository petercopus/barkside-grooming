<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'customer:read',
});

const searchQuery = ref('');
const debouncedSearch = useDebouncedRef(searchQuery, 300);

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
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'petCount', header: 'Pets' },
  { accessorKey: 'lastAppointment', header: 'Last Appointment' },
];
</script>

<template>
  <AppPage
    title="Customers"
    description="View and manage customer accounts"
    width="wide">
    <AppTable
      card="default"
      title="All Customers"
      :columns="columns"
      :data="rows"
      :loading="loading"
      :on-select="onRowSelect"
      empty-icon="i-lucide-contact"
      empty-title="No customers found"
      empty-description="No customers match the current search."
      empty-action-label="Add Customer"
      empty-action-icon="i-lucide-plus"
      @empty-action="navigateTo('/admin/customers/new')">
      <template #actions>
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search customers..."
          size="sm"
          class="w-64" />
        <UButton
          to="/admin/customers/new"
          icon="i-lucide-plus"
          label="Add Customer"
          size="sm" />
      </template>

      <template #name-cell="{ row }: any">
        <div class="flex items-center gap-2">
          <UAvatar
            :alt="row.original.name"
            size="lg" />
          <div class="flex flex-col">
            <AppCustomerLink :id="row.original.id">{{ row.original.name }}</AppCustomerLink>
            <AppPhoneLink :phoneNumber="row.original.phone" />
          </div>
        </div>
      </template>

      <template #petCount-cell="{ row }: any">
        <UBadge variant="subtle">
          {{ row.original.petCount }}
        </UBadge>
      </template>

      <template #lastAppointment-cell="{ row }: any">
        {{ row.original.lastAppointment ? formatDate(row.original.lastAppointment) : 'Never' }}
      </template>
    </AppTable>
  </AppPage>
</template>
