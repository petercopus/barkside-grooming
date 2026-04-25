<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'role:manage',
});
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Add Role"
      back-to="/admin/settings/roles" />

    <RolesEditLayout mode="create" />
  </div>
</template>
