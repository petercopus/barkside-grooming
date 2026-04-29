<script setup lang="ts">
import type { TableColumn as NuxtTableColumn } from '@nuxt/ui';
import type { TableColumn as ReportTableColumn, TableData } from '~~/shared/types/report';

const props = defineProps<{
  data: TableData;
}>();

const columns = computed<NuxtTableColumn<Record<string, unknown>>[]>(() =>
  props.data.columns.map((col) => ({
    accessorKey: col.key,
    header: col.label,
  })),
);

function formatValue(value: unknown, format?: ReportTableColumn['format']): string {
  if (value == null) return '—';

  switch (format) {
    case 'currency':
      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'number':
      return Number(value).toLocaleString('en-US');
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    case 'date':
      return formatDate(value as string);
    default:
      return String(value);
  }
}
</script>

<template>
  <AppTable
    card="default"
    :columns="columns"
    :data="data.rows"
    empty-icon="i-lucide-table"
    empty-title="No data"
    empty-description="No data matches the current filters.">
    <template
      v-for="col in data.columns"
      :key="col.key"
      #[`${col.key}-cell`]="{ row }: any">
      {{ formatValue(row.original[col.key], col.format) }}
    </template>
  </AppTable>
</template>
