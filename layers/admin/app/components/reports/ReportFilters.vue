<script setup lang="ts">
import type { FilterField } from '~~/shared/types/report';

const props = defineProps<{
  filters: FilterField[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  submit: [filters: Record<string, unknown>];
}>();

// Initialize filter values from defaults
const filterValues = ref<Record<string, unknown>>({});

watch(
  () => props.filters,
  (newFilters) => {
    const vals: Record<string, unknown> = {};
    for (const f of newFilters) {
      vals[f.key] = filterValues.value[f.key] ?? f.default ?? undefined;
    }
    filterValues.value = vals;
  },
  { immediate: true },
);

function onDateChange(key: string, cd: import('@internationalized/date').CalendarDate | undefined) {
  filterValues.value[key] = cd ? calendarDateToString(cd) : undefined;
}

function submit() {
  emit('submit', { ...filterValues.value });
}
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <div
      v-for="filter in filters"
      :key="filter.key"
      class="flex flex-col gap-1">
      <label class="text-xs font-medium text-muted">{{ filter.label }}</label>

      <!-- date -->
      <AppDatePicker
        v-if="filter.type === 'date'"
        :model-value="parseCalendarDate(filterValues[filter.key] as string)"
        @update:model-value="onDateChange(filter.key, $event)" />

      <!-- select -->
      <USelect
        v-else-if="filter.type === 'select'"
        :model-value="filterValues[filter.key] as string"
        :items="filter.options ?? []"
        value-key="value"
        label-key="label"
        class="w-36"
        size="sm"
        @update:model-value="filterValues[filter.key] = $event" />

      <!-- number -->
      <UInput
        v-else-if="filter.type === 'number'"
        :model-value="filterValues[filter.key] as number"
        type="number"
        class="w-24"
        size="sm"
        @update:model-value="filterValues[filter.key] = $event" />

      <!-- text -->
      <UInput
        v-else
        :model-value="filterValues[filter.key] as string"
        size="sm"
        class="w-40"
        @update:model-value="filterValues[filter.key] = $event" />
    </div>

    <UButton
      label="Run Report"
      icon="i-lucide-play"
      size="sm"
      :loading="loading"
      @click="submit" />
  </div>
</template>
