<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    flush?: boolean;
    to?: string;
  }>(),
  { flush: false },
);
</script>

<template>
  <UCard
    :class="to ? 'cursor-pointer hover:ring-1 hover:ring-primary rounded-lg transition' : undefined"
    :ui="{
      body: flush ? 'p-0 sm:p-0' : undefined,
    }"
    @click="to ? navigateTo(to) : undefined">
    <template
      v-if="title || $slots.title || $slots.actions"
      #header>
      <div class="flex justify-between items-center">
        <slot name="title">
          <h3
            v-if="title"
            class="text-sm font-medium">
            {{ title }}
          </h3>
        </slot>

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
