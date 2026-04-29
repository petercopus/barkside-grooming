<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'reports:view',
});

const route = useRoute();
const reportId = route.params.id as string;

const activeFilters = ref<Record<string, unknown>>({});

const { data, status } = await useFetch(`/api/admin/reports/${reportId}`, {
  params: computed(() => {
    const params: Record<string, string> = {};
    for (const [key, val] of Object.entries(activeFilters.value)) {
      if (val !== undefined && val !== null && val !== '') {
        params[key] = String(val);
      }
    }
    return params;
  }),
});

const loading = computed(() => status.value === 'pending');
const meta = computed(() => data.value?.meta);
const result = computed(() => data.value?.result);

const displayType = computed(() => meta.value?.display?.type || 'table');
const showKpis = computed(() => displayType.value.includes('kpi') && result.value?.kpis?.length);
const showChart = computed(() => displayType.value.includes('chart') && result.value?.chart);
const showTable = computed(() => displayType.value.includes('table') && result.value?.table);

function onSubmit(filters: Record<string, unknown>) {
  activeFilters.value = filters;
}
</script>

<template>
  <AppPage
    :title="meta?.name ?? 'Report'"
    :description="meta?.description"
    back-to="/admin/reports"
    width="wide">
    <!-- filters -->
    <AppCard v-if="meta?.filters?.length">
      <ReportsReportFilters
        :filters="meta.filters"
        :loading="loading"
        @submit="onSubmit" />
    </AppCard>

    <!-- KPIs -->
    <ReportsReportKpis
      v-if="showKpis"
      :kpis="result!.kpis!" />

    <!-- chart -->
    <AppCard
      v-if="showChart"
      title="Chart">
      <ReportsReportChart
        :type="meta!.display.chart!.type"
        :data="result!.chart!" />
    </AppCard>

    <!-- table -->
    <div v-if="showTable">
      <ReportsReportTable :data="result!.table!" />
    </div>
  </AppPage>
</template>
