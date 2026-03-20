<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    actionIcon?: string;
    variant?: 'page' | 'section' | 'inline';
  }>(),
  { variant: 'page' },
);

defineEmits<{
  action: [];
}>();
</script>

<template>
  <!-- Inline variant -->
  <div
    v-if="variant === 'inline'"
    class="text-center py-4 text-dimmed">
    <p class="text-sm">{{ title }}</p>
  </div>

  <!-- Section variant -->
  <div
    v-else-if="variant === 'section'"
    class="flex flex-col items-center justify-center py-8 text-center">
    <div
      v-if="icon"
      class="flex items-center justify-center size-12 rounded-xl bg-muted/50 mb-4">
      <UIcon
        :name="icon"
        class="size-6 text-muted" />
    </div>
    <p class="text-sm font-medium text-toned">{{ title }}</p>
    <p
      v-if="description"
      class="text-sm text-muted mt-1">
      {{ description }}
    </p>
  </div>

  <!-- Page variant (default) -->
  <div
    v-else
    class="flex flex-col items-center justify-center py-16 text-center">
    <div
      v-if="icon"
      class="flex items-center justify-center size-12 rounded-xl bg-muted/50 mb-4">
      <UIcon
        :name="icon"
        class="size-6 text-muted" />
    </div>
    <p class="text-sm font-medium text-toned">{{ title }}</p>
    <p
      v-if="description"
      class="text-sm text-muted mt-1">
      {{ description }}
    </p>
    <UButton
      v-if="actionLabel"
      :icon="actionIcon"
      :label="actionLabel"
      class="mt-4"
      @click="$emit('action')" />
  </div>
</template>
