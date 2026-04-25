<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});
</script>

<template>
  <div class="cms-container py-6 sm:py-10 space-y-6">
    <AppPageHeader
      title="Add Pet"
      back-to="/me/pets" />

    <PetsEditLayout mode="create" />
  </div>
</template>
