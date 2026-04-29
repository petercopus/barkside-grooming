<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'document:read:all',
});

const statusFilter = ref('all');
const typeFilter = ref('all');

const { data, status } = await useFetch('/api/admin/documents', {
  params: computed(() => ({
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    type: typeFilter.value === 'all' ? undefined : typeFilter.value,
  })),
});

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.documents ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/documents/${row.original.id}`);
}

const columns = [
  { accessorKey: 'fileName', header: 'File Name' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'uploader', header: 'Uploader' },
  { accessorKey: 'petName', header: 'Pet' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: 'Date' },
];

const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const typeItems = [{ label: 'All', value: 'all' }, ...docTypeItems];
</script>

<template>
  <AppPage
    title="Documents"
    description="Review and manage uploaded documents"
    width="wide">
    <AppTable
      card="default"
      title="All Documents"
      :columns="columns"
      :data="rows"
      :loading="loading"
      :on-select="onRowSelect"
      empty-icon="i-lucide-file-text"
      empty-title="No documents found">
      <template #actions>
        <div class="flex gap-2">
          <USelect
            v-model="statusFilter"
            :items="statusItems"
            size="sm"
            class="w-36" />
          <USelect
            v-model="typeFilter"
            :items="typeItems"
            size="sm"
            class="w-48" />
        </div>
      </template>

      <template #type-cell="{ row }: any">
        <UBadge variant="subtle">
          {{ formatDocType(row.original.type) }}
        </UBadge>
      </template>

      <template #uploader-cell="{ row }: any">
        <AppCustomerLink
          v-if="row.original.uploadedByUserId"
          :id="row.original.uploadedByUserId">
          {{ formatFullName(row.original.uploaderFirstName, row.original.uploaderLastName) }}
        </AppCustomerLink>
      </template>

      <template #petName-cell="{ row }: any">
        <AppPetLink
          v-if="row.original.petId"
          :id="row.original.petId">
          {{ row.original.petName }}
        </AppPetLink>
        <span v-else>—</span>
      </template>

      <template #status-cell="{ row }: any">
        <AppStatusBadge
          kind="document"
          :value="row.original.status" />
      </template>

      <template #createdAt-cell="{ row }: any">
        {{ formatDate(row.original.createdAt) }}
      </template>
    </AppTable>
  </AppPage>
</template>
