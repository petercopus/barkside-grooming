<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'booking:read:all',
});

const statusFilter = ref<string>();
const dateFilter = ref<string>();

const { data, status, refresh } = await useFetch('/api/admin/appointments', {
  params: computed(() => ({
    status: statusFilter.value || undefined,
    date: dateFilter.value || undefined,
  })),
});

const loading = computed(() => status.value === 'pending');
const rows = computed(() => data.value?.appointments ?? []);

const columns = [
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'pets', header: 'Pets' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' },
];

async function updateStatus(id: string, newStatus: string) {
  await $fetch(`/api/admin/appointments/${id}/status`, {
    method: 'PATCH',
    body: { status: newStatus },
  });

  await refresh();
}

function nextAction(currentStatus: string) {
  switch (currentStatus) {
    case 'pending':
      return {
        label: 'Confirm',
        status: 'confirmed',
        color: 'primary' as const,
      };
    case 'confirmed':
      return {
        label: 'Check In',
        status: 'in_progress',
        color: 'success' as const,
      };
    case 'in_progress':
      return {
        label: 'Complete',
        status: 'completed',
        color: 'success' as const,
      };
    default:
      return null;
  }
}

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/appointments/${row.original.id}`);
}
</script>

<template>
  <div>
    <AppPageHeader
      title="Appointments"
      description="View and manage all appointments" />

    <div class="py-4">
      <AppTable
        card="default"
        title="All Appointments"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :on-select="onRowSelect"
        empty-icon="i-lucide-calendar"
        empty-title="No appointments found"
        empty-description="No appointments match the current filters.">
        <template #actions>
          <!-- Filters -->
          <div class="flex gap-3">
            <USelect
              v-model="statusFilter"
              :items="apptStatusOptions"
              placeholder="All statuses"
              class="w-48"
              size="xs" />
          </div>
        </template>

        <!-- Pets -->
        <template #pets-cell="{ row }: any">
          <div class="flex gap-2">
            <UBadge
              v-for="pet in row.original.pets"
              :key="pet.id"
              variant="subtle">
              {{ pet.petName }}
            </UBadge>
          </div>
        </template>

        <!-- Date -->
        <template #date-cell="{ row }: any">
          {{ row.original.pets[0]?.scheduledDate ?? '—' }}
        </template>

        <!-- Status -->
        <template #status-cell="{ row }: any">
          <UBadge
            :color="apptStatusColor[row.original.status] ?? 'neutral'"
            variant="subtle">
            {{ row.original.status }}
          </UBadge>
        </template>

        <!-- Actions -->
        <template #actions-cell="{ row }: any">
          <div class="flex gap-1">
            <UButton
              v-if="nextAction(row.original.status)"
              :label="nextAction(row.original.status)!.label"
              :color="nextAction(row.original.status)!.color"
              variant="subtle"
              size="sm"
              @click="updateStatus(row.original.id, nextAction(row.original.status)!.status)" />
            <UButton
              v-if="['pending', 'pending_documents', 'confirmed'].includes(row.original.status)"
              label="Cancel"
              color="error"
              variant="ghost"
              size="sm"
              @click="updateStatus(row.original.id, 'cancelled')" />
          </div>
        </template>
      </AppTable>
    </div>
  </div>
</template>
