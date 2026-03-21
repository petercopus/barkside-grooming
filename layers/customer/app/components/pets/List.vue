<script setup lang="ts">
import type { Pet } from '~~/shared/types/pet';

const props = withDefaults(
  defineProps<{
    selectable?: boolean;
    pets?: Pet[];
  }>(),
  {
    selectable: false,
  },
);

const selected = defineModel<string[]>('selected', { default: [] });

function toggle(petId: string) {
  const idx = selected.value.indexOf(petId);
  if (idx >= 0) selected.value.splice(idx, 1);
  else selected.value.push(petId);
}
</script>

<template>
  <UPageList>
    <UPageCard
      v-for="pet in pets"
      :key="pet.id"
      variant="subtle"
      :class="{
        'opacity-50': selectable && !pet.sizeCategoryId,
        'ring-2 ring-success-400': selectable && selected.includes(pet.id),
      }"
      @click="selectable && pet.sizeCategoryId && toggle(pet.id)">
      <template #body>
        <UUser
          :name="pet.name"
          :description="pet?.breed ? pet.breed : undefined"
          :avatar="{
            src: '',
            alt: pet.name,
          }" />
      </template>
    </UPageCard>
  </UPageList>
</template>
