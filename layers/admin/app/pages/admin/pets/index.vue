<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'pet:read:all',
});

const { hasPerm } = usePermissions();
const canCreate = computed(() => hasPerm('pet:manage:all'));

const searchQuery = ref('');
const debouncedSearch = useDebouncedRef(searchQuery, 300);

const { data, status } = await useFetch('/api/admin/pets', {
  params: computed(() => ({
    search: debouncedSearch.value || undefined,
  })),
});

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.pets ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/pets/${row.original.id}`);
}

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'owner', header: 'Owner' },
  { accessorKey: 'lastAppointment', header: 'Last Appointment' },
];
</script>

<template>
  <AppPage
    title="Pets"
    description="All registered pets"
    width="wide">
    <AppTable
      card="default"
      title="All Pets"
      :columns="columns"
      :data="rows"
      :loading="loading"
      :on-select="onRowSelect"
      empty-icon="i-lucide-paw-print"
      empty-title="No pets found"
      :empty-action-label="canCreate ? 'Add Pet' : undefined"
      empty-action-icon="i-lucide-plus"
      @empty-action="navigateTo('/admin/pets/new')">
      <template #actions>
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search pets..."
          size="sm"
          class="w-64" />

        <UButton
          v-if="canCreate"
          to="/admin/pets/new"
          icon="i-lucide-plus"
          label="Add Pet"
          size="sm" />
      </template>

      <template #name-cell="{ row }: any">
        <div class="flex items-center gap-2">
          <UAvatar
            :alt="row.original.name"
            size="lg" />

          <div class="flex flex-col">
            <AppPetLink :id="row.original.id">
              {{ row.original.name }}
            </AppPetLink>
            {{ row.original.breed }}
          </div>
        </div>
      </template>

      <template #owner-cell="{ row }: any">
        <AppCustomerLink :id="row.original.ownerId">
          {{ formatFullName(row.original.ownerFirstName, row.original.ownerLastName) }}
        </AppCustomerLink>
      </template>

      <template #lastAppointment-cell="{ row }: any">
        {{ row.original.lastAppointment ? formatDate(row.original.lastAppointment) : 'Never' }}
      </template>
    </AppTable>
  </AppPage>
</template>
