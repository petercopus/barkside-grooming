<script setup lang="ts">
definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const route = useRoute();
const petId = route.params.id as string;

const { data } = await useFetch(`/api/pets/${petId}`);

if (!data.value?.pet) {
  throw createError({ statusCode: 404, message: 'Pet not found' });
}

const pet = data.value.pet;
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      :title="`Edit ${pet.name}`"
      back-to="/me/pets" />

    <PetsEditLayout
      mode="edit"
      :initial-values="pet"
      :pet-id="petId" />
  </div>
</template>
