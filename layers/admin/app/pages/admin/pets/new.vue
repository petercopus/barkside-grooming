<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'pet:manage:all',
});

const route = useRoute();
const defaultOwnerId = (route.query.ownerId as string | undefined) ?? undefined;
</script>

<template>
  <PetsAdminEditLayout
    mode="create"
    title="Add Pet"
    back-to="/admin/pets"
    :default-owner-id="defaultOwnerId" />
</template>
