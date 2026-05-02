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
    class="rounded-2xl border border-default/70 bg-white/40 px-6 py-12 text-center flex flex-col items-center justify-center">
    <div
      v-if="icon"
      class="inline-flex size-14 items-center justify-center rounded-2xl bg-primary-100/70 text-primary-600 mb-4 shadow-sm">
      <UIcon
        :name="icon"
        class="size-6" />
    </div>
    <p class="font-display-soft text-2xl text-barkside-900 leading-tight">{{ title }}</p>
    <p
      v-if="description"
      class="text-sm text-muted mt-2 max-w-md">
      {{ description }}
    </p>
    <UButton
      v-if="actionLabel"
      :icon="actionIcon"
      :label="actionLabel"
      size="lg"
      class="mt-5"
      @click="$emit('action')" />
  </div>

  <!-- Page variant (default) -->
  <div
    v-else
    class="rounded-2xl bg-white/40 px-6 py-16 text-center flex flex-col items-center justify-center">
    <div
      v-if="icon"
      class="inline-flex size-16 items-center justify-center rounded-2xl bg-primary-100/70 text-primary-600 mb-5 shadow-sm">
      <UIcon
        :name="icon"
        class="size-7" />
    </div>
    <p class="font-display-soft text-3xl text-barkside-900 leading-tight">{{ title }}</p>
    <p
      v-if="description"
      class="text-sm text-muted mt-2 max-w-md">
      {{ description }}
    </p>
    <UButton
      v-if="actionLabel"
      :icon="actionIcon"
      :label="actionLabel"
      size="lg"
      class="mt-6"
      @click="$emit('action')" />
  </div>
</template>
