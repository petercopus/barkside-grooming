<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'permission', permission: 'employee:read' });

const { data } = await useFetch('/api/employees');

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
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Employees</h1>
      <UButton
        to="/employee/employees/new"
        icon="i-lucide-plus"
        label="Add Employee" />
    </div>

    <UTable
      :data="data?.employees ?? []"
      :columns="columns">
      <!-- Roles -->
      <template #roles-cell="{ row }">
        <div class="flex gap-1">
          <UBadge
            v-for="role in row.original.roles"
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
          :to="`/employee/employees/${row.original.id}/edit`"
          icon="i-lucide-pencil"
          variant="ghost"
          size="sm" />
      </template>
    </UTable>
  </div>
</template>
