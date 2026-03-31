<script setup lang="ts">
import type { ServiceWithPricing } from '~~/shared/types/service';

defineProps<{
  services: ServiceWithPricing[];
}>();

const selected = defineModel<number[]>('selected', { default: () => [] });

function toggle(id: number) {
  const idx = selected.value.indexOf(id);
  if (idx === -1) selected.value = [...selected.value, id];
  else selected.value = selected.value.filter((s) => s !== id);
}
</script>

<template>
  <UPageGrid>
    <UPageCard
      v-for="service in services"
      :key="service.id"
      variant="subtle"
      :class="{
        'ring-2 ring-success-400': selected.includes(service.id),
      }"
      @click="toggle(service.id)">
      <template #body>
        <UUser
          :name="service.name"
          :description="service.description ?? undefined" />

        <p class="text-sm text-muted">{{ service?.pricing.durationMinutes }} minutes</p>
        <p class="text-sm font-medium">${{ formatCents(service?.pricing.priceCents) }}</p>
      </template>
    </UPageCard>
  </UPageGrid>
</template>
