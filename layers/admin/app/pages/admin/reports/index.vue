<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'reports:view',
});

const { data } = await useFetch('/api/admin/reports');

const reports = computed(() => data.value?.reports ?? []);

// group reports by category
const grouped = computed(() => {
  const groups: Record<string, typeof reports.value> = {};
  for (const report of reports.value) {
    const cat = report.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(report);
  }
  return groups;
});

const categoryIcons: Record<string, string> = {
  Financial: 'i-lucide-dollar-sign',
  Operations: 'i-lucide-activity',
  Staff: 'i-lucide-users',
};
</script>

<template>
  <div>
    <AppPageHeader
      title="Reports"
      description="View business reports and analytics" />

    <div class="space-y-8 py-4">
      <div
        v-for="(categoryReports, category) in grouped"
        :key="category">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2">
          <UIcon
            :name="categoryIcons[category] || 'i-lucide-folder'"
            class="text-muted" />
          {{ category }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AppCard
            v-for="report in categoryReports"
            :key="report.id"
            :to="`/admin/reports/${report.id}`">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="
                    report.display?.chart?.type === 'doughnut'
                      ? 'i-lucide-pie-chart'
                      : 'i-lucide-bar-chart-3'
                  "
                  class="text-primary shrink-0" />
                <h3 class="font-medium">{{ report.name }}</h3>
              </div>
              <p class="text-sm text-muted">{{ report.description }}</p>
            </div>
          </AppCard>
        </div>
      </div>

      <AppEmptyState
        v-if="reports.length === 0"
        icon="i-lucide-bar-chart-3"
        title="No reports available"
        description="Reports will appear here once configured." />
    </div>
  </div>
</template>
