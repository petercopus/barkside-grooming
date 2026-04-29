<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'pet:manage:all',
});

const route = useRoute();
const id = route.params.id as string;

const { data } = await useFetch(`/api/admin/pets/${id}`);

if (!data.value?.pet) {
  throw createError({ statusCode: 404, message: 'Pet not found' });
}

const pet = data.value.pet;

const initialValues = {
  name: pet.name,
  breed: pet.breed,
  weightLbs: pet.weightLbs,
  dateOfBirth: pet.dateOfBirth,
  gender: pet.gender,
  coatType: pet.coatType,
  specialNotes: pet.specialNotes,
};
</script>

<template>
  <PetsAdminEditLayout
    mode="edit"
    title="Edit Pet"
    :back-to="`/admin/pets/${id}`"
    :pet-id="id"
    :initial-values="initialValues" />
</template>
