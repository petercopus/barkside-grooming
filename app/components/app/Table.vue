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
    showRowChevron?: boolean;
  }>(),
  { skeletonRows: 5, showRowChevron: true },
);

defineEmits<{
  emptyAction: [];
}>();

const effectiveColumns = computed<TableColumn<Record<string, unknown>>[]>(() => {
  if (!props.onSelect || !props.showRowChevron) return props.columns;
  return [
    ...props.columns,
    { id: '_navChevron', header: '', size: 32 } as TableColumn<Record<string, unknown>>,
  ];
});

const tableUi = computed(() => ({
  thead: 'bg-elevated/70',
  th: 'font-normal text-muted py-2',
  td: 'text-default',
  tr: props.onSelect ? 'group' : '',
}));

const slots = useSlots();
const cellSlotNames = computed(() => Object.keys(slots).filter((name) => name !== 'actions'));

const showSkeleton = computed(() => props.loading && props.data.length === 0);
const showEmpty = computed(() => !props.loading && props.data.length === 0);

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
    <slot
      v-else-if="showEmpty && $slots.empty"
      name="empty" />
    <AppEmptyState
      v-else-if="showEmpty && emptyTitle"
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
      :action-label="emptyActionLabel"
      :action-icon="emptyActionIcon"
      :variant="emptyVariant ?? 'page'"
      @action="$emit('emptyAction')" />

    <UTable
      v-else
      :columns="effectiveColumns"
      :data="data"
      :loading="loading"
      :on-select="onSelect"
      :ui="tableUi">
      <template
        v-for="name in cellSlotNames"
        :key="name"
        #[name]="slotProps">
        <slot
          :name="name"
          v-bind="slotProps ?? {}" />
      </template>
      <template #_navChevron-cell>
        <div class="flex items-center justify-end">
          <UIcon
            name="i-lucide-arrow-right"
            class="size-5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </template>
    </UTable>
  </AppCard>

  <template v-else>
    <AppTableSkeleton
      v-if="showSkeleton"
      :columns="columns.length"
      :rows="skeletonRows"
      :skeleton-width="skeletonWidth" />
    <slot
      v-else-if="showEmpty && $slots.empty"
      name="empty" />
    <AppEmptyState
      v-else-if="showEmpty && emptyTitle"
      :icon="emptyIcon"
      :title="emptyTitle"
      :description="emptyDescription"
      :action-label="emptyActionLabel"
      :action-icon="emptyActionIcon"
      :variant="emptyVariant ?? 'page'"
      @action="$emit('emptyAction')" />

    <UTable
      v-else
      :columns="effectiveColumns"
      :data="data"
      :loading="loading"
      :on-select="onSelect"
      :ui="tableUi">
      <template
        v-for="name in cellSlotNames"
        :key="name"
        #[name]="slotProps">
        <slot
          :name="name"
          v-bind="slotProps ?? {}" />
      </template>
      <template #_navChevron-cell>
        <div class="flex items-center justify-end">
          <UIcon
            name="i-lucide-arrow-right"
            class="size-5 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </template>
    </UTable>
  </template>
</template>
