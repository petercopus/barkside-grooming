<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    columns?: 1 | 2 | 3;
  }>(),
  { columns: 2 },
);

const gridClass = computed(() => {
  switch (props.columns) {
    case 1:
      return 'grid-cols-1';
    case 3:
      return 'grid-cols-1 md:grid-cols-3';
    default:
      return 'grid-cols-1 md:grid-cols-2';
  }
});
</script>

<template>
  <div :class="['grid gap-4 text-sm', gridClass]">
    <slot />
  </div>
</template>
