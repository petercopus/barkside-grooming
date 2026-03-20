<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'employee:read',
});

const { data, status } = await useFetch('/api/admin/employees');

const loading = computed(() => status.value === 'pending');
const rows = computed(() => (data.value?.employees ?? []) as Record<string, unknown>[]);

function onRowSelect(_e: Event, row: any) {
  navigateTo(`/admin/employees/${row.original.id}/edit`);
}

const columns = [
  { accessorKey: 'firstName', header: 'First Name' },
  { accessorKey: 'lastName', header: 'Last Name' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'roles', header: 'Roles' },
  { accessorKey: 'isActive', header: 'Status' },
  { accessorKey: 'actions', header: '' },
];
</script>

<template>
  <div>
    <AppPageHeader
      title="Employees"
      description="Manage employees, permissions, and schedules" />

    <div class="py-4">
      <AppTable
        card="default"
        title="All Employees"
        :columns="columns"
        :data="rows"
        :loading="loading"
        :on-select="onRowSelect"
        empty-icon="i-lucide-users"
        empty-title="No employees found"
        empty-description="Add your first employee to get started."
        empty-action-label="Add Employee"
        empty-action-icon="i-lucide-plus"
        @empty-action="navigateTo('/admin/employees/new')">
        <template #actions>
          <UButton
            to="/admin/employees/new"
            icon="i-lucide-plus"
            label="Add Employee"
            size="sm" />
        </template>

        <!-- Roles -->
        <template #roles-cell="{ row }">
          <div class="flex gap-1">
            <UBadge
              v-for="role in row.original.roles as { id: number; name: string }[]"
              :key="role.id"
              variant="subtle">
              {{ role.name }}
            </UBadge>
          </div>
        </template>

        <!-- Status -->
        <template #isActive-cell="{ row }">
          <UBadge
            :color="row.original.isActive ? 'success' : 'error'"
            variant="subtle">
            {{ row.original.isActive ? 'Active' : 'Inactive' }}
          </UBadge>
        </template>

        <!-- Actions -->
        <template #actions-cell="{ row }">
          <UButton
            :to="`/admin/employees/${row.original.id}/edit`"
            icon="i-lucide-pencil"
            variant="ghost"
            size="sm" />
        </template>
      </AppTable>
    </div>
  </div>
</template>
