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

const petColumns = [{ accessorKey: 'name', header: 'Name' }];

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
  <AppPage
    :title="formatFullName(customer.firstName, customer.lastName)"
    back-to="/admin/customers">
    <template #actions>
      <UButton
        :to="`/admin/customers/${id}/edit`"
        icon="i-lucide-pencil"
        label="Edit"
        size="sm" />
    </template>

    <AppCard title="Profile">
      <AppFieldGrid>
        <AppField
          label="Email"
          :value="customer.email" />
        <AppField label="Phone">
          <AppPhoneLink :phone-number="customer.phone" />
        </AppField>
        <AppField label="Status">
          <AppStatusBadge
            kind="active"
            :value="customer.isActive" />
        </AppField>
        <AppField
          label="Member Since"
          :value="formatDate(customer.createdAt)" />
      </AppFieldGrid>
    </AppCard>

    <AppTable
      card="default"
      title="Pets"
      :columns="petColumns"
      :data="petRows"
      :on-select="onPetSelect"
      empty-icon="i-lucide-paw-print"
      empty-title="No pets"
      empty-action-label="Add Pet"
      empty-action-icon="i-lucide-plus"
      @empty-action="navigateTo(`/admin/pets/new?ownerId=${id}`)">
      <template #actions>
        <UButton
          :to="`/admin/pets/new?ownerId=${id}`"
          icon="i-lucide-plus"
          label="Add Pet"
          size="sm"
          variant="ghost" />
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
    </AppTable>

    <AppTable
      card="default"
      title="Appointments"
      :columns="apptColumns"
      :data="apptRows"
      :on-select="onAppointmentSelect"
      empty-icon="i-lucide-calendar"
      empty-title="No appointments">
      <template #date-cell="{ row }: any">
        <div class="flex flex-col whitespace-nowrap">
          <span>{{ formatDate(row.original.pets[0]?.scheduledDate) }}</span>
          <span class="text-muted text-xs">
            {{ formatClockTime(row.original.pets[0]?.startTime) }}
          </span>
        </div>
      </template>

      <template #pets-cell="{ row }: any">
        <div class="flex">
          <template
            v-for="(pet, index) in row.original.pets"
            :key="pet.id">
            <AppPetLink :id="pet.petId">
              {{ pet.petName }}{{ index !== row.original.pets.length - 1 ? ', ' : '' }}
            </AppPetLink>
          </template>
        </div>
      </template>

      <template #status-cell="{ row }: any">
        <AppStatusBadge
          kind="appointment"
          :value="row.original.status" />
      </template>
    </AppTable>
  </AppPage>
</template>
