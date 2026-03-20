<script setup lang="ts">
defineProps<{
  title?: string;
  error?: string | null;
}>();
</script>

<template>
  <AppCard :title="title">
    <template
      v-if="$slots.actions"
      #actions>
      <slot name="actions" />
    </template>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4" />

    <slot />
  </AppCard>
</template>
