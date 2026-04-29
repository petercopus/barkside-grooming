<script setup lang="ts">
const props = defineProps<{
  tagline?: string;
  headline?: string;
  content: string;
  alignment?: 'left' | 'center';
}>();

const alignClass = computed(() =>
  props.alignment === 'center' ? 'mx-auto text-center' : 'text-left',
);
</script>

<template>
  <section class="cms-container sm:px-6">
    <div
      class="prose prose-lg has-dropcap reveal-subtle max-w-3xl"
      :class="alignClass">
      <p
        v-if="tagline"
        class="kicker mb-2">
        {{ tagline }}
      </p>

      <h2
        v-if="headline"
        class="font-display text-3xl sm:text-4xl text-barkside-900 mb-6">
        {{ headline }}
      </h2>

      <div v-html="content" />
    </div>
  </section>
</template>
