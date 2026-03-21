<script setup lang="ts">
import type { ServiceWithPricing } from '~~/shared/types/service';

defineProps<{
  services: ServiceWithPricing[];
}>();

const selected = defineModel<number | null>('selected', { default: null });
</script>

<template>
  <UPageGrid>
    <UPageCard
      v-for="service in services"
      :key="service.id"
      variant="subtle"
      :class="{
        'ring-2 ring-success-400': selected === service.id,
      }"
      @click="selected = service.id">
      <template #body>
        <UUser
          :name="service.name"
          :description="service.description ?? undefined" />

        <p class="text-sm text-muted">{{ service?.pricing.durationMinutes }} minutes</p>
        <p class="text-sm font-medium">${{ (service?.pricing.priceCents / 100).toFixed(2) }}</p>
      </template>
    </UPageCard>
  </UPageGrid>
</template>
