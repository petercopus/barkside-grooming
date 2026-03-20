<script setup lang="ts">
definePageMeta({
  layout: 'customer',
  middleware: 'auth',
});
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Add Pet"
      back-to="/me/pets" />

    <PetsEditLayout mode="create" />
  </div>
</template>
