<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const { data, refresh } = await useFetch('/api/pets');

async function deletePet(id: string) {
  if (!confirm('Really remove pet?')) return;

  await $fetch(`/api/pets/${id}`, { method: 'DELETE' });
  await refresh();
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">My Pets</h1>
      <UButton
        to="/me/pets/new"
        icon="i-lucide-plus">
        Add Pet
      </UButton>
    </div>

    <!-- Empty state -->
    <div
      v-if="!data?.pets?.length"
      class="text-center py-12 text-muted">
      <p>No pets yet.</p>
    </div>

    <!-- Pet cards grid -->
    <div
      v-else
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UCard
        v-for="pet in data.pets"
        :key="pet.id">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-lg">{{ pet.name }}</h3>
            <p
              v-if="pet.breed"
              class="text-sm text-muted">
              {{ pet.breed }}
            </p>
          </div>
        </div>

        <dl class="mt-3 text-sm space-y-1">
          <div
            v-if="pet.weightLbs"
            class="flex gap-2">
            <dt class="text-muted">Weight:</dt>
            <dd>{{ pet.weightLbs }}</dd>
          </div>
          <div
            v-if="pet.gender"
            class="flex gap-2">
            <dt class="text-muted">Gender:</dt>
            <dd>{{ pet.gender }}</dd>
          </div>
          <div
            v-if="pet.coatType"
            class="flex gap-2">
            <dt class="text-muted">Coat:</dt>
            <dd>{{ pet.coatType }}</dd>
          </div>
        </dl>

        <div class="flex gap-2 mt-4">
          <UButton
            :to="`/me/pets/${pet.id}/edit`"
            variant="outline"
            size="sm"
            icon="i-lucide-pencil">
            Edit
          </UButton>
          <UButton
            variant="outline"
            size="sm"
            color="error"
            icon="i-lucide-trash-2"
            @click="deletePet(pet.id)" />
        </div>
      </UCard>
    </div>
  </div>
</template>
