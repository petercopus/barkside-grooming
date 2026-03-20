<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  backTo?: string;
}>();
</script>

<template>
  <div class="flex items-center justify-between py-4">
    <div class="flex items-center gap-3 min-w-0">
      <UButton
        v-if="backTo"
        variant="ghost"
        icon="i-lucide-arrow-left"
        size="sm"
        @click="navigateTo(backTo)" />

      <div class="min-w-0">
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p
          v-if="description"
          class="text-sm text-muted">
          {{ description }}
        </p>
        <div
          v-if="$slots.info"
          class="flex items-center gap-2 shrink-0 pt-2">
          <slot name="info" />
        </div>
      </div>
    </div>

    <div
      v-if="$slots.actions"
      class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>
