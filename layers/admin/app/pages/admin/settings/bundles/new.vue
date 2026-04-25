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
      title="Add Bundle"
      back-to="/admin/settings/bundles" />

    <BundlesEditLayout mode="create" />
  </div>
</template>
