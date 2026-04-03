<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'pet:read:all',
});

const route = useRoute();
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
        groomer: appt.pets.find((pp: any) => pp.petId === id)?.assignedGroomerId ?? '—',
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
  <div>
    <AppPageHeader
      :title="pet.name"
      back-to="/admin/pets">
      <template #info>
        <span class="text-sm text-muted">
          Owner:
          <NuxtLink
            :to="`/admin/customers/${pet.owner.id}`"
            class="text-primary hover:underline">
            {{ pet.owner.firstName }} {{ pet.owner.lastName }}
          </NuxtLink>
        </span>
      </template>
    </AppPageHeader>

    <div class="py-4 space-y-6">
      <!-- pet info -->
      <AppCard title="details">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted">Breed</span>
            <p>{{ pet.breed || '—' }}</p>
          </div>
          <div>
            <span class="text-muted">Weight</span>
            <p>{{ pet.weightLbs ? `${pet.weightLbs} lbs` : '—' }}</p>
          </div>
          <div>
            <span class="text-muted">Date of Birth</span>
            <p>{{ pet.dateOfBirth || '—' }}</p>
          </div>
          <div>
            <span class="text-muted">Gender</span>
            <p>{{ pet.gender || '—' }}</p>
          </div>
          <div>
            <span class="text-muted">Coat Type</span>
            <p>{{ pet.gender || '—' }}</p>
          </div>
          <div>
            <span class="text-muted">Status</span>
            <p>
              <UBadge
                :color="pet.isActive ? 'success' : 'error'"
                variant="subtle">
                {{ pet.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </p>
          </div>
          <div
            v-if="pet.specialNotes"
            class="md:col-span-2">
            <span class="text-muted">Special Notes</span>
            <p>{{ pet.specialNotes }}</p>
          </div>
        </div>
      </AppCard>

      <!-- Appointment history -->
      <AppTable
        card="default"
        title="Appointment History"
        :columns="apptColumns"
        :data="apptRows"
        :on-select="onAppointmentSelect"
        empty-icon="i-lucide-calendar"
        empty-title="No appointments">
        <!-- time -->
        <template #time-cell="{ row }: any">
          {{ row.original.startTime }} — {{ row.original.endTime }}
        </template>

        <!-- status -->
        <template #status-cell="{ row }: any">
          <UBadge
            :color="apptStatusColor[row.original.status] ?? 'neutral'"
            variant="subtle">
            {{ row.original.status }}
          </UBadge>
        </template>
      </AppTable>
    </div>
  </div>
</template>
