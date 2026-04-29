<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'role:manage',
});
</script>

<template>
  <RolesEditLayout
    mode="create"
    title="Add Role"
    back-to="/admin/settings/roles" />
</template>
