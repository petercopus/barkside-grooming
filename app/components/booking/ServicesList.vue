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
      :class="[
        'relative cursor-pointer transition-all duration-150',
        selected.includes(service.id)
          ? 'ring-2 ring-primary-500 bg-primary-50/60 shadow-sm'
          : 'hover:ring-1 hover:ring-primary-200',
      ]"
      @click="toggle(service.id)">
      <template #body>
        <span
          v-if="selected.includes(service.id)"
          class="absolute top-3 right-3 inline-flex items-center justify-center size-6 rounded-full bg-primary-500 text-white shadow">
          <UIcon
            name="i-lucide-check"
            class="size-4" />
        </span>

        <UUser
          :name="service.name"
          :description="service.description ?? undefined" />

        <div class="mt-2 flex items-center gap-3 text-sm">
          <span class="inline-flex items-center gap-1 text-muted">
            <UIcon
              name="i-lucide-clock"
              class="size-3.5" />
            {{ service?.pricing.durationMinutes }} min
          </span>

          <span class="font-semibold">${{ formatCents(service?.pricing.priceCents) }}</span>
        </div>
      </template>
    </UPageCard>
  </UPageGrid>
</template>
