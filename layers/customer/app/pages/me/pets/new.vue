<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});
</script>

<template>
  <div class="cms-container py-10 sm:py-14">
    <AppPageIntro
      kicker="New profile"
      title="Add a pup"
      description="Tell us a little about your pup so we can roll out the red carpet."
      back-to="/me/pets" />

    <div class="mt-8">
      <PetsEditLayout mode="create" />
    </div>
  </div>
</template>
