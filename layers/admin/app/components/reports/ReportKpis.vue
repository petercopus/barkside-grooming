<script setup lang="ts">
import type { KpiItem } from '~~/shared/types/report';

defineProps<{
  kpis: KpiItem[];
}>();
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <AppCard
      v-for="kpi in kpis"
      :key="kpi.label">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted">{{ kpi.label }}</span>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold">{{ kpi.value }}</span>
          <UBadge
            v-if="kpi.change !== undefined"
            :color="kpi.change >= 0 ? 'success' : 'error'"
            variant="subtle"
            size="xs">
            <UIcon :name="kpi.change >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'" />
            {{ Math.abs(kpi.change).toFixed(1) }}%
            <span
              v-if="kpi.changeLabel"
              class="ml-0.5">
              {{ kpi.changeLabel }}
            </span>
          </UBadge>
        </div>
      </div>
    </AppCard>
  </div>
</template>
