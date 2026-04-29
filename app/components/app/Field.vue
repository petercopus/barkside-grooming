<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value?: string | number | null;
    span?: '1' | 'full';
  }>(),
  { span: '1' },
);
</script>

<template>
  <div :class="span === 'full' ? 'md:col-span-2' : ''">
    <span class="text-muted">{{ label }}</span>
    <div class="mt-0.5">
      <slot>
        <p>{{ value ?? '—' }}</p>
      </slot>
    </div>
  </div>
</template>
