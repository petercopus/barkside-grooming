<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'booking:read:all',
});

const statusFilter = ref<AppointmentStatus>();
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
  { accessorKey: 'dateTime', header: 'Date / Time' },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'pets', header: 'Pets' },
  { accessorKey: 'services', header: 'Services' },
  { accessorKey: 'groomer', header: 'Groomer' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' },
];

const statusItems = apptStatusOptions.map((value) => ({
  label: apptStatusLabel[value] ?? value,
  value,
}));

async function updateStatus(id: string, newStatus: string) {
  await $fetch(`/api/admin/appointments/${id}/status`, {
    method: 'PATCH',
    body: { status: newStatus },
  });

  await refresh();
}

const NEXT_ACTION: Partial<
  Record<AppointmentStatus, { label: string; icon: string; status: AppointmentStatus }>
> = {
  pending: { label: 'Confirm', icon: 'i-lucide-check', status: 'confirmed' },
  confirmed: { label: 'Check In', icon: 'i-lucide-log-in', status: 'in_progress' },
  in_progress: { label: 'Complete', icon: 'i-lucide-check-check', status: 'completed' },
};

const CANCELLABLE_STATUSES: string[] = [
  'pending',
  'pending_documents',
  'confirmed',
] satisfies AppointmentStatus[];

function nextAction(currentStatus: AppointmentStatus) {
  const next = NEXT_ACTION[currentStatus];
  if (!next) return null;
  return { ...next, color: apptStatusColor[next.status] };
}

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/appointments/${row.original.id}`);
}
</script>

<template>
  <AppPage
    title="Appointments"
    description="View and manage all appointments"
    width="wide">
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
        <USelect
          v-model="statusFilter"
          :items="statusItems"
          placeholder="All statuses"
          class="w-48"
          size="xs" />
      </template>

      <template #dateTime-cell="{ row }: any">
        <div class="flex flex-col text-sm whitespace-nowrap">
          <span>{{ formatDate(row.original.pets[0]?.scheduledDate) }}</span>
          <span class="text-muted">
            {{ formatClockTime(row.original.pets[0]?.startTime) }}
          </span>
        </div>
      </template>

      <template #customerName-cell="{ row }: any">
        <div class="flex items-center gap-2">
          <UAvatar
            :alt="row.original.customerName"
            size="lg" />
          <div class="flex flex-col">
            <AppCustomerLink :id="row.original.customerId">
              {{ row.original.customerName }}
            </AppCustomerLink>
            <AppPhoneLink :phoneNumber="row.original.phone" />
          </div>
        </div>
      </template>

      <template #pets-cell="{ row }: any">
        <div class="flex flex-col">
          <AppPetLink
            v-for="pet in row.original.pets"
            :id="pet.petId"
            :key="pet.id">
            {{ pet.petName }}
          </AppPetLink>
        </div>
      </template>

      <template #services-cell="{ row }: any">
        <div class="flex flex-col text-sm">
          <span
            v-for="pet in row.original.pets"
            :key="pet.id">
            <template v-if="pet.services?.length">
              {{ pet.services.map((s: any) => s.serviceName).join(', ') }}
            </template>
            <span
              v-else
              class="text-muted"
              >—</span
            >
          </span>
        </div>
      </template>

      <template #groomer-cell="{ row }: any">
        <div class="flex flex-col text-sm">
          <span
            v-for="pet in row.original.pets"
            :key="pet.id"
            :class="{ 'text-muted': !pet.assignedGroomerName }">
            {{ pet.assignedGroomerName ?? 'Unassigned' }}
          </span>
        </div>
      </template>

      <template #status-cell="{ row }: any">
        <AppStatusBadge
          kind="appointment"
          :value="row.original.status" />
      </template>

      <template #actions-cell="{ row }: any">
        <div class="flex gap-1">
          <UTooltip
            v-if="nextAction(row.original.status)"
            :text="nextAction(row.original.status)!.label">
            <UButton
              :icon="nextAction(row.original.status)!.icon"
              :color="nextAction(row.original.status)!.color"
              :aria-label="nextAction(row.original.status)!.label"
              variant="subtle"
              size="xs"
              square
              @click.stop="
                updateStatus(row.original.id, nextAction(row.original.status)!.status)
              " />
          </UTooltip>

          <UTooltip
            v-if="CANCELLABLE_STATUSES.includes(row.original.status)"
            text="Cancel">
            <UButton
              icon="i-lucide-x"
              color="error"
              aria-label="Cancel"
              variant="ghost"
              size="xs"
              square
              @click.stop="updateStatus(row.original.id, 'cancelled')" />
          </UTooltip>
        </div>
      </template>
    </AppTable>
  </AppPage>
</template>
