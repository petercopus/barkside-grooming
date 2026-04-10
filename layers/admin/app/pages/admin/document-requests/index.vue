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
  { accessorKey: 'documentType', header: 'Type' },
  { accessorKey: 'petName', header: 'Pet' },
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
  <div>
    <AppPageHeader
      title="Document Requests"
      description="Request documents from customers">
      <template #actions>
        <UButton
          to="/admin/document-requests/new"
          icon="i-lucide-plus">
          New Request
        </UButton>
      </template>
    </AppPageHeader>

    <div class="py-4">
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

        <!-- target customer -->
        <template #target-cell="{ row }: any">
          {{ row.original.targetFirstName }} {{ row.original.targetLastName }}
        </template>

        <!-- type -->
        <template #documentType-cell="{ row }: any">
          {{ formatDocType(row.original.documentType) }}
        </template>

        <!-- pet -->
        <template #petName-cell="{ row }: any">
          {{ row.original.petName ?? '—' }}
        </template>

        <!-- status -->
        <template #status-cell="{ row }: any">
          <UBadge
            :color="docReqStatusColor[row.original.status] ?? 'neutral'"
            variant="subtle">
            {{ row.original.status }}
          </UBadge>
        </template>

        <!-- due date -->
        <template #dueDate-cell="{ row }: any">
          {{ row.original.dueDate ?? '—' }}
        </template>

        <!-- requester -->
        <template #requester-cell="{ row }: any">
          {{ row.original.requesterFirstName }} {{ row.original.requesterLastName }}
        </template>

        <!-- created -->
        <template #createdAt-cell="{ row }: any">
          {{ new Date(row.original.createdAt).toLocaleDateString() }}
        </template>
      </AppTable>
    </div>
  </div>
</template>
