<script setup lang="ts">
import type { Pet } from '~~/shared/types/pet';

const props = withDefaults(
  defineProps<{
    selectable?: boolean;
    pets?: Pet[];
    showAddNew?: boolean;
  }>(),
  {
    selectable: false,
    showAddNew: false,
  },
);

const selected = defineModel<string[]>('selected', { default: () => [] });

function toggle(petId: string) {
  if (selected.value.includes(petId)) {
    selected.value = selected.value.filter((id) => id !== petId);
  } else {
    selected.value = [...selected.value, petId];
  }
}

const hasMissingSize = computed(() => (props.pets ?? []).some((p) => !p.sizeCategoryId));
</script>

<template>
  <div>
    <p
      v-if="selectable"
      class="text-sm text-muted mb-3">
      Select one or more pups to book.
    </p>

    <UPageList>
      <UPageCard
        v-for="pet in pets"
        :key="pet.id"
        variant="subtle"
        :class="[
          'mb-4 transition-all duration-150',
          selectable && pet.sizeCategoryId ? 'cursor-pointer' : '',
          selectable && !pet.sizeCategoryId ? 'opacity-60 cursor-not-allowed' : '',
          selectable && selected.includes(pet.id)
            ? 'ring-2 ring-primary-500 bg-primary-50/60 shadow-sm'
            : selectable && pet.sizeCategoryId
              ? 'hover:ring-1 hover:ring-primary-200'
              : '',
        ]"
        @click="selectable && pet.sizeCategoryId && toggle(pet.id)">
        <template #body>
          <div class="flex items-center justify-between gap-3">
            <UUser
              :name="pet.name"
              :description="pet?.breed ? pet.breed : undefined"
              :avatar="{ alt: pet.name, icon: 'i-lucide-paw-print' }" />

            <div class="flex items-center gap-2 shrink-0">
              <UBadge
                v-if="selectable && !pet.sizeCategoryId"
                color="warning"
                variant="subtle"
                size="sm"
                icon="i-lucide-alert-triangle">
                Size not set
              </UBadge>

              <span
                v-if="selectable && pet.sizeCategoryId"
                :class="[
                  'inline-flex items-center justify-center size-6 rounded-md border transition',
                  selected.includes(pet.id)
                    ? 'bg-primary-500 border-primary-500 text-white shadow'
                    : 'border-default bg-elevated',
                ]"
                aria-hidden="true">
                <UIcon
                  v-if="selected.includes(pet.id)"
                  name="i-lucide-check"
                  class="size-4" />
              </span>
            </div>
          </div>
        </template>
      </UPageCard>

      <UPageCard
        v-if="showAddNew"
        variant="subtle"
        to="/me/pets/new"
        class="mb-4 cursor-pointer border-dashed hover:ring-1 hover:ring-primary-200 transition">
        <template #body>
          <div class="flex items-center gap-3 text-primary-600">
            <span
              class="inline-flex items-center justify-center size-10 rounded-full bg-primary-100">
              <UIcon
                name="i-lucide-plus"
                class="size-5" />
            </span>

            <div>
              <p class="font-medium">Add a new pup</p>
              <p class="text-sm text-muted">We'll come back to your booking after.</p>
            </div>
          </div>
        </template>
      </UPageCard>
    </UPageList>

    <p
      v-if="selectable && hasMissingSize"
      class="text-sm text-muted mt-2 flex items-start gap-1.5">
      <UIcon
        name="i-lucide-info"
        class="size-4 text-primary-500 shrink-0 mt-0.5" />

      <span>
        Pups marked
        <span class="font-medium">Size not set</span>
        need a weight on file before they can be booked.
        <NuxtLink
          to="/me/pets"
          class="text-primary-600 underline underline-offset-2">
          Manage pets
        </NuxtLink>
      </span>
    </p>
  </div>
</template>
