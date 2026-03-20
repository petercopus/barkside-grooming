<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const { data, refresh } = await useFetch('/api/pets');
const confirm = useConfirmDialog();

async function deletePet(id: string) {
  const confirmed = await confirm({
    title: 'Remove pet',
    description: 'Are you sure you want to remove this pet?',
    confirmLabel: 'Remove',
  });

  if (!confirmed) return;

  await $fetch(`/api/pets/${id}`, { method: 'DELETE' });
  await refresh();
}
</script>

<template>
  <div>
    <AppPageHeader
      title="My Pets"
      description="Manage your pets">
      <template #actions>
        <UButton
          to="/me/pets/new"
          icon="i-lucide-plus">
          Add Pet
        </UButton>
      </template>
    </AppPageHeader>

    <div class="py-4">
      <AppEmptyState
        v-if="!data?.pets?.length"
        icon="i-lucide-paw-print"
        title="No pets yet"
        description="Add your first pet to get started."
        action-label="Add Pet"
        action-icon="i-lucide-plus"
        variant="section"
        @action="navigateTo('/me/pets/new')" />

      <!-- Pet cards grid -->
      <div
        v-else
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AppCard
          v-for="pet in data.pets"
          :key="pet.id"
          :title="pet.name">
          <template #actions>
            <UButton
              :to="`/me/pets/${pet.id}/edit`"
              variant="ghost"
              size="sm"
              icon="i-lucide-pencil" />
            <UButton
              variant="ghost"
              size="sm"
              color="error"
              icon="i-lucide-trash-2"
              @click="deletePet(pet.id)" />
          </template>

          <div>
            <dl class="text-sm space-y-1">
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
          </div>
        </AppCard>
      </div>
    </div>
  </div>
</template>
