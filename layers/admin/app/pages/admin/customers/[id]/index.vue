<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'customer:read',
});

const route = useRoute();
const id = route.params.id as string;

const { data } = await useFetch(`/api/admin/customers/${id}`);

if (!data.value?.customer) {
  throw createError({ statusCode: 404, message: 'Customer not found' });
}

const customer = computed(() => data.value!.customer);
const petRows = computed(() => (customer.value.pets ?? []) as Record<string, unknown>[]);
const apptRows = computed(() => (customer.value.appointments ?? []) as Record<string, unknown>[]);

const petColumns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'breed', header: 'Breed' },
  { accessorKey: 'weightLbs', header: 'Weight (lbs)' },
  { accessorKey: 'gender', header: 'Gender' },
  { accessorKey: 'coatType', header: 'Coat Type' },
];

const apptColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'pets', header: 'Pets' },
  { accessorKey: 'status', header: 'Status' },
];

function onPetSelect(_e: Event, row: any) {
  navigateTo(`/admin/pets/${row.original.id}`);
}

function onAppointmentSelect(_e: Event, row: any) {
  navigateTo(`/admin/appointments/${row.original.id}`);
}
</script>

<template>
  <div>
    <AppPageHeader
      :title="`${customer.firstName} ${customer.lastName}`"
      back-to="/admin/customers">
      <template #actions>
        <UButton
          :to="`/admin/customers/${id}/edit`"
          icon="i-lucide-pencil"
          label="Edit"
          size="sm" />
      </template>
    </AppPageHeader>

    <div class="py-4 space-y-6">
      <!-- Profiole -->
      <AppCard title="Profile">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-muted">Email</span>
            <p>{{ customer.email }}</p>
          </div>
          <div>
            <span class="text-muted">Phone</span>
            <p>{{ customer.phone || '—' }}</p>
          </div>
          <div>
            <span class="text-muted">Status</span>
            <p>
              <UBadge
                :color="customer.isActive ? 'success' : 'error'"
                variant="subtle">
                {{ customer.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </p>
          </div>
          <div>
            <span class="text-muted">Member Since</span>
            <p>{{ new Date(customer.createdAt).toLocaleDateString() }}</p>
          </div>
        </div>
      </AppCard>

      <!-- Pets -->
      <AppTable
        card="default"
        title="Pets"
        :columns="petColumns"
        :data="petRows"
        :on-select="onPetSelect"
        empty-icon="i-lucide-paw-print"
        empty-title="No pets" />

      <!-- Appointments -->
      <AppTable
        card="default"
        title="Appointments"
        :columns="apptColumns"
        :data="apptRows"
        :on-select="onAppointmentSelect"
        empty-icon="i-lucide-calendar"
        empty-title="No appointments">
        <!-- date -->
        <template #date-cell="{ row }: any">
          {{ row.original.pets[0]?.scheduledDate ?? '—' }}
        </template>

        <!-- pets -->
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
