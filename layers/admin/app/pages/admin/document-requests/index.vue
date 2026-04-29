<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'document:request',
});

const statusFilter = ref('all');

const { data, status } = await useFetch('/api/admin/document-requests', {
  params: computed(() => ({
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  })),
});

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.requests ?? []) as Record<string, unknown>[]);

const columns = [
  { accessorKey: 'target', header: 'Customer' },
  { accessorKey: 'petName', header: 'Pet' },
  { accessorKey: 'documentType', header: 'Type' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'dueDate', header: 'Due Date' },
  { accessorKey: 'requester', header: 'Requested By' },
  { accessorKey: 'createdAt', header: 'Created' },
];

const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Expired', value: 'expired' },
];
</script>

<template>
  <AppPage
    title="Document Requests"
    description="Request documents from customers"
    width="wide">
    <template #actions>
      <UButton
        to="/admin/document-requests/new"
        icon="i-lucide-plus">
        New Request
      </UButton>
    </template>

    <AppTable
      card="default"
      title="All Requests"
      :columns="columns"
      :data="rows"
      :loading="loading"
      empty-icon="i-lucide-file-question"
      empty-title="No document requests">
      <template #actions>
        <USelect
          v-model="statusFilter"
          :items="statusItems"
          size="sm"
          class="w-36" />
      </template>

      <template #target-cell="{ row }: any">
        <div class="flex items-center gap-2">
          <UAvatar
            :alt="row.original.targetName"
            size="lg" />
          <div class="flex flex-col">
            <AppCustomerLink :id="row.original.targetId">
              {{ row.original.targetName }}
            </AppCustomerLink>
            <AppPhoneLink :phoneNumber="row.original.targetPhone" />
          </div>
        </div>
      </template>

      <template #petName-cell="{ row }: any">
        <div class="flex flex-col">
          <AppPetLink :id="row.original.petId">
            {{ row.original.petName }}
          </AppPetLink>
          {{ row.original.petBreed }}
        </div>
      </template>

      <template #documentType-cell="{ row }: any">
        <UBadge variant="subtle">
          {{ formatDocType(row.original.documentType) }}
        </UBadge>
      </template>

      <template #status-cell="{ row }: any">
        <AppStatusBadge
          kind="document-request"
          :value="row.original.status" />
      </template>

      <template #dueDate-cell="{ row }: any">
        {{ formatDate(row.original.dueDate) }}
      </template>

      <template #requester-cell="{ row }: any">
        {{ formatFullName(row.original.requesterFirstName, row.original.requesterLastName) }}
      </template>

      <template #createdAt-cell="{ row }: any">
        {{ formatDate(row.original.createdAt) }}
      </template>
    </AppTable>
  </AppPage>
</template>
