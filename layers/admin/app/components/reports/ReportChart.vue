<script setup lang="ts">
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line, Pie } from 'vue-chartjs';
import type { ChartData } from '~~/shared/types/report';

if (import.meta.client) {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
  );
}

const props = withDefaults(
  defineProps<{
    type: 'bar' | 'line' | 'pie' | 'doughnut';
    data: ChartData;
    height?: number;
  }>(),
  { height: 300 },
);

const chartComponents = { bar: Bar, line: Line, pie: Pie, doughnut: Doughnut };
const chartComponent = computed(() => chartComponents[props.type]);

const chartOptions = computed(() => {
  const isPieType = props.type === 'pie' || props.type === 'doughnut';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: isPieType,
        position: 'bottom' as const,
      },
    },
    scales: isPieType
      ? {}
      : {
          y: { beginAtZero: true },
        },
  };
});
</script>

<template>
  <ClientOnly>
    <div :style="{ height: `${height}px` }">
      <component
        :is="chartComponent"
        :data="data"
        :options="chartOptions" />
    </div>
    <template #fallback>
      <div
        class="flex items-center justify-center bg-muted/10 rounded-lg"
        :style="{ height: `${height}px` }">
        <USkeleton class="w-full h-full rounded-lg" />
      </div>
    </template>
  </ClientOnly>
</template>
