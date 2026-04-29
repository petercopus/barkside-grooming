<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    backTo?: string;
    width?: 'content' | 'wide';
  }>(),
  { width: 'content' },
);
</script>

<template>
  <div :class="['mx-auto w-full', width === 'wide' ? 'max-w-6xl' : 'max-w-4xl']">
    <AppPageHeader
      :title="title"
      :description="description"
      :back-to="backTo">
      <template
        v-if="$slots.info"
        #info>
        <slot name="info" />
      </template>
      <template
        v-if="$slots.actions"
        #actions>
        <slot name="actions" />
      </template>
    </AppPageHeader>

    <div class="py-4 space-y-6">
      <slot />
    </div>
  </div>
</template>
