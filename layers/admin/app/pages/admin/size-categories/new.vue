<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'size-category:manage',
});
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Add Size Category"
      back-to="/admin/size-categories" />

    <SizeCategoriesEditLayout mode="create" />
  </div>
</template>
