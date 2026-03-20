<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'employee:manage',
});
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Add Employee"
      back-to="/employee/employees" />

    <EmployeesEditLayout mode="create" />
  </div>
</template>
