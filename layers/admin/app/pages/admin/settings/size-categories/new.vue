<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'size-category:manage',
});
</script>

<template>
  <SizeCategoriesEditLayout
    mode="create"
    title="Add Size Category"
    back-to="/admin/settings/size-categories" />
</template>
