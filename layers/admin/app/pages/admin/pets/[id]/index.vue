<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'pet:read:all',
});

const route = useRoute();
const { hasPerm } = usePermissions();
const id = route.params.id as string;

const { data } = await useFetch(`/api/admin/pets/${id}`);

if (!data.value?.pet) {
  throw createError({ statusCode: 404, message: 'Pet not found' });
}

const pet = computed(() => data.value!.pet);

const apptRows = computed(() => {
  const appts = pet.value.appointments ?? [];

  // flatten to per pet rows
  return appts.flatMap((appt: any) =>
    appt.pets
      .filter((p: any) => p.petId === id)
      .map((p: any) => ({
        appointmentId: appt.id,
        scheduledDate: p.scheduledDate,
        startTime: p.startTime,
        endTime: p.endTime,
        groomer: p.assignedGroomerId ?? '—',
        status: appt.status,
      })),
  ) as Record<string, unknown>[];
});

const apptColumns = [
  { accessorKey: 'scheduledDate', header: 'Date' },
  { accessorKey: 'time', header: 'Time' },
  { accessorKey: 'status', header: 'Status' },
];

function onAppointmentSelect(_e: Event, row: any) {
  navigateTo(`/admin/appointments/${row.original.appointmentId}`);
}
</script>

<template>
  <AppPage
    :title="pet.name"
    back-to="/admin/pets">
    <template #info>
      <span class="text-sm text-muted">
        Owner:
        <AppCustomerLink :id="pet.owner.id">
          {{ formatFullName(pet.owner.firstName, pet.owner.lastName) }}
        </AppCustomerLink>
      </span>
    </template>
    <template #actions>
      <UButton
        v-if="hasPerm('pet:manage:all')"
        :to="`/admin/pets/${id}/edit`"
        icon="i-lucide-pencil"
        label="Edit"
        size="sm" />
    </template>

    <AppCard title="Details">
      <AppFieldGrid>
        <AppField
          label="Breed"
          :value="pet.breed || '—'" />
        <AppField
          label="Weight"
          :value="pet.weightLbs ? `${pet.weightLbs} lbs` : '—'" />
        <AppField
          label="Date of Birth"
          :value="formatDate(pet.dateOfBirth)" />
        <AppField
          label="Gender"
          :value="pet.gender ? (genderLabel[pet.gender] ?? pet.gender) : '—'" />
        <AppField
          label="Coat Type"
          :value="pet.coatType ? (coatTypeLabel[pet.coatType] ?? pet.coatType) : '—'" />
        <AppField label="Status">
          <AppStatusBadge
            kind="active"
            :value="pet.isActive" />
        </AppField>
        <AppField
          v-if="pet.specialNotes"
          label="Special Notes"
          :value="pet.specialNotes"
          span="full" />
      </AppFieldGrid>
    </AppCard>

    <AppTable
      card="default"
      title="Appointment History"
      :columns="apptColumns"
      :data="apptRows"
      :on-select="onAppointmentSelect"
      empty-icon="i-lucide-calendar"
      empty-title="No appointments">
      <template #scheduledDate-cell="{ row }: any">
        {{ formatDate(row.original.scheduledDate) }}
      </template>

      <template #time-cell="{ row }: any">
        {{ formatTimeRange(row.original.startTime, row.original.endTime) }}
      </template>

      <template #status-cell="{ row }: any">
        <AppStatusBadge
          kind="appointment"
          :value="row.original.status" />
      </template>
    </AppTable>
  </AppPage>
</template>
