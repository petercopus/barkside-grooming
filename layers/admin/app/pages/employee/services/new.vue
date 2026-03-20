<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Add Service"
      back-to="/employee/services" />

    <ServicesEditLayout mode="create" />
  </div>
</template>
