<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});
</script>

<template>
  <BundlesEditLayout
    mode="create"
    title="Add Bundle"
    back-to="/admin/settings/bundles" />
</template>
