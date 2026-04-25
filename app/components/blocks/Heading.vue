<script setup lang="ts">
const props = defineProps<{
  level?: 'page' | 'section';
  heading: string;
  kicker?: string;
  subheading?: string;
  tagline?: string;
  alignment?: 'left' | 'center';
}>();

const isPage = computed(() => props.level === 'page');

const alignClass = computed(() =>
  props.alignment === 'center' ? 'text-center mx-auto' : 'text-left',
);
</script>

<template>
  <section class="relative">
    <div class="cms-container sm:px-6">
      <div
        class="reveal"
        :class="[alignClass, isPage ? 'max-w-4xl' : 'max-w-3xl']">
        <p
          v-if="kicker"
          class="kicker reveal-subtle">
          {{ kicker }}
        </p>

        <component
          :is="isPage ? 'h1' : 'h2'"
          class="font-display-soft leading-[1.02] text-barkside-900 delay-1 reveal"
          :class="
            isPage
              ? 'mt-4 text-5xl sm:text-6xl lg:text-7xl'
              : 'mt-3 text-4xl sm:text-4xl lg:text-5xl'
          ">
          {{ heading }}
        </component>

        <p
          v-if="subheading"
          class="max-w-2xl leading-relaxed text-barkside-700 delay-2 reveal-subtle"
          :class="[
            alignment === 'center' ? 'mx-auto' : '',
            isPage ? 'mt-6 text-lg' : 'mt-4 text-base',
          ]">
          {{ subheading }}
        </p>

        <div
          v-if="tagline"
          class="flex items-center gap-4 delay-3 reveal-subtle"
          :class="[alignment === 'center' ? 'justify-center' : '', isPage ? 'mt-8' : 'mt-5']">
          <span
            class="h-px bg-coral-500"
            :class="isPage ? 'w-16' : 'w-12'" />
          <span
            class="font-hand text-coral-600"
            :class="isPage ? 'text-xl' : 'text-lg'">
            {{ tagline }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
