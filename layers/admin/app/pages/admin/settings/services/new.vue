<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});
</script>

<template>
  <ServicesEditLayout
    mode="create"
    title="Add Service"
    back-to="/admin/settings/services" />
</template>
