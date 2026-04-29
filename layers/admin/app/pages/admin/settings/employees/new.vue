<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'employee:manage',
});
</script>

<template>
  <EmployeesEditLayout
    mode="create"
    title="Add Employee"
    back-to="/admin/settings/employees" />
</template>
