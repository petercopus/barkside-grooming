<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown>[];
    columns: TableColumn<Record<string, unknown>>[];
    loading?: boolean;
    onSelect?: (e: Event, row: any) => void;
    emptyIcon?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyActionLabel?: string;
    emptyActionIcon?: string;
    emptyVariant?: 'page' | 'section' | 'inline';
    card?: 'default' | 'thin';
    title?: string;
    skeletonRows?: number;
  }>(),
  { skeletonRows: 5 },
);

defineEmits<{
  emptyAction: [];
}>();

const slots = useSlots();

const tableSlots = computed(() => {
  const result: Record<string, any> = {};

  for (const name of Object.keys(slots)) {
    if (name !== 'actions') result[name] = slots[name];
  }

  return result;
});

// Show skeleton rows on initial load (loading + no data yet)
const showSkeleton = computed(() => props.loading && props.data.length === 0);

// Deterministic varied widths for skeleton rows
function skeletonWidth(row: number, col: number): string {
  return `${50 + ((row * 17 + col * 31) % 40)}%`;
}
</script>

<template>
  <AppCard
    v-if="card"
    :title="title"
    flush>
    <template
      v-if="$slots.actions"
      #actions>
      <slot name="actions" />
    </template>

    <AppTableSkeleton
      v-if="showSkeleton"
      :columns="columns.length"
      :rows="skeletonRows"
      :skeleton-width="skeletonWidth" />

    <UTable
      v-else
      :columns="columns"
      :data="data"
      :loading="loading"
      :on-select="onSelect"
      :ui="{
        thead: 'bg-elevated/70',
        th: 'font-normal text-muted py-2',
        td: 'text-default',
      }">
      <template
        v-for="(_, name) in tableSlots"
        :key="name"
        #[name]="slotProps">
        <slot
          :name="name"
          v-bind="slotProps ?? {}" />
      </template>
      <template
        v-if="!$slots.empty && emptyTitle"
        #empty>
        <AppEmptyState
          :icon="emptyIcon"
          :title="emptyTitle"
          :description="emptyDescription"
          :action-label="emptyActionLabel"
          :action-icon="emptyActionIcon"
          :variant="emptyVariant ?? 'page'"
          @action="$emit('emptyAction')" />
      </template>
    </UTable>
  </AppCard>

  <template v-else>
    <AppTableSkeleton
      v-if="showSkeleton"
      :columns="columns.length"
      :rows="skeletonRows"
      :skeleton-width="skeletonWidth" />

    <UTable
      v-else
      :columns="columns"
      :data="data"
      :loading="loading"
      :on-select="onSelect"
      :ui="{
        thead: 'bg-elevated/70',
        th: 'font-normal text-muted py-2',
        td: 'text-default',
      }">
      <template
        v-for="(_, name) in tableSlots"
        :key="name"
        #[name]="slotProps">
        <slot
          :name="name"
          v-bind="slotProps ?? {}" />
      </template>
      <template
        v-if="!$slots.empty && emptyTitle"
        #empty>
        <AppEmptyState
          :icon="emptyIcon"
          :title="emptyTitle"
          :description="emptyDescription"
          :action-label="emptyActionLabel"
          :action-icon="emptyActionIcon"
          :variant="emptyVariant ?? 'page'"
          @action="$emit('emptyAction')" />
      </template>
    </UTable>
  </template>
</template>
