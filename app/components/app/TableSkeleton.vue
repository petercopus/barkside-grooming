<script setup lang="ts">
defineProps<{
  columns: number;
  rows: number;
  skeletonWidth: (row: number, col: number) => string;
}>();
</script>

<template>
  <div class="w-full">
    <div class="border-b border-default bg-elevated/70 flex">
      <div
        v-for="j in columns"
        :key="j"
        class="flex-1 px-3 py-2">
        <div class="h-3.5 w-16 bg-muted/40 rounded animate-pulse" />
      </div>
    </div>

    <div
      v-for="i in rows"
      :key="i"
      class="flex border-b border-default last:border-b-0">
      <div
        v-for="j in columns"
        :key="j"
        class="flex-1 px-3 py-3">
        <div
          class="h-3.5 rounded animate-pulse bg-muted/30"
          :style="{ width: skeletonWidth(i, j) }" />
      </div>
    </div>
  </div>
</template>
