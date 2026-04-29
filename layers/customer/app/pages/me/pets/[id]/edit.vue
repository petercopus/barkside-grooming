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
  <div class="cms-container py-10 sm:py-14">
    <AppPageIntro
      kicker="Edit profile"
      :title="pet.name"
      :description="pet.breed ? `Updating ${pet.name}'s ${pet.breed} profile.` : `Update ${pet.name}'s profile.`"
      back-to="/me/pets" />

    <div class="mt-8">
      <PetsEditLayout
        mode="edit"
        :initial-values="pet"
        :pet-id="petId" />
    </div>
  </div>
</template>
