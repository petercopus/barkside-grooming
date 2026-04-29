<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'customer:manage',
});
</script>

<template>
  <CustomersEditLayout
    mode="create"
    title="Add Customer"
    back-to="/admin/customers" />
</template>
