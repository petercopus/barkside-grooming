<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    flush?: boolean;
  }>(),
  { flush: false },
);
</script>

<template>
  <UCard
    :ui="{
      body: flush ? 'p-0 sm:p-0' : undefined,
    }">
    <template
      v-if="title || $slots.actions"
      #header>
      <div class="flex justify-between items-center">
        <h3
          v-if="title"
          class="text-sm font-medium">
          {{ title }}
        </h3>
        <div
          v-if="$slots.actions"
          class="flex gap-2">
          <slot name="actions" />
        </div>
      </div>
    </template>

    <slot />
  </UCard>
</template>
