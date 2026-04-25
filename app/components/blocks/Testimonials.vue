<script setup lang="ts">
import type { Testimonial } from '~/data/testimonials';

const props = defineProps<{
  headline?: string;
  tagline?: string;
  testimonials: Testimonial[];
}>();

const featured = computed(() => props.testimonials[0]);
const secondary = computed(() => props.testimonials.slice(1));

const ROTATIONS = ['-1.2deg', '1.5deg', '-0.8deg', '1deg', '-1.4deg', '0.7deg'];
</script>

<template>
  <section class="relative overflow-hidden bg-bone-100 py-24 sm:py-32">
    <div
      class="torn-top absolute inset-x-0 top-0 h-4 bg-bone-50"
      aria-hidden="true" />

    <div
      class="pointer-events-none absolute -right-8 top-8 select-none text-[22rem] leading-none text-coral-200 font-display-soft italic opacity-70 sm:top-14"
      aria-hidden="true">
      &ldquo;
    </div>

    <div class="relative cms-container sm:px-6">
      <div class="mb-14 max-w-3xl">
        <p class="kicker reveal-subtle">{{ tagline || 'Wagging Endorsements' }}</p>
        <h2
          class="font-display-soft mt-4 text-5xl leading-[1.04] text-barkside-900 sm:text-6xl delay-1 reveal">
          {{ headline || 'What pet parents say' }}
        </h2>
      </div>

      <figure
        v-if="featured"
        class="relative mb-16 max-w-4xl reveal delay-2">
        <div class="flex items-start gap-6">
          <span
            class="font-display-soft select-none text-[7rem] leading-[0.7] text-coral-500 sm:text-[10rem]"
            aria-hidden="true">
            &ldquo;
          </span>
          <div class="flex-1 pt-4">
            <blockquote
              class="font-display-sub text-2xl leading-[1.3] text-barkside-900 sm:text-3xl md:text-4xl">
              <span class="italic">{{ featured.content }}</span>
            </blockquote>
          </div>
        </div>
        <figcaption class="mt-6 flex items-center gap-3 text-barkside-700">
          <span class="inline-block h-px w-10 bg-coral-500" />
          <span class="font-medium">{{ featured.title }}</span>
          <span
            v-if="featured.subtitle"
            class="text-barkside-700/70">
            · {{ featured.subtitle }}
          </span>
          <span
            v-if="featured.rating"
            class="ml-auto flex items-center gap-0.5"
            :aria-label="`${featured.rating} out of 5 stars`">
            <UIcon
              v-for="star in 5"
              :key="star"
              name="barkside:star"
              class="h-4 w-4"
              :class="star <= (featured.rating ?? 0) ? 'text-coral-500' : 'text-bone-300'"
              aria-hidden="true" />
          </span>
        </figcaption>
      </figure>

      <div
        v-if="secondary.length"
        class="grid gap-6 md:grid-cols-3">
        <div
          v-for="(t, i) in secondary"
          :key="t.id"
          class="reveal-subtle"
          :class="[
            i % 2 === 0 ? 'md:translate-y-4' : '',
            i % 3 === 1 ? 'md:-translate-y-3' : '',
            `delay-${Math.min(i + 3, 7)}`,
          ]">
          <figure
            class="relative rounded-card border border-bone-300/60 bg-bone-50 p-6 shadow-[0_8px_24px_-12px_rgba(15,30,43,0.18)] transition-transform duration-300 hover:rotate-0! hover:-translate-y-1 sm:p-8"
            :style="{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]})` }">
            <div
              v-if="t.rating"
              class="mb-3 flex gap-0.5"
              :aria-label="`${t.rating} out of 5 stars`">
              <UIcon
                v-for="star in 5"
                :key="star"
                name="barkside:star"
                class="h-4 w-4"
                :class="star <= (t.rating ?? 0) ? 'text-coral-500' : 'text-bone-300'"
                aria-hidden="true" />
            </div>
            <blockquote class="font-display-caption text-lg leading-[1.4] italic text-barkside-900">
              &ldquo;{{ t.content }}&rdquo;
            </blockquote>
            <figcaption class="mt-5 flex items-center gap-3 text-sm">
              <span
                class="flex h-9 w-9 items-center justify-center rounded-full bg-barkside-900 font-display text-sm text-bone-50"
                aria-hidden="true">
                {{ (t.title || '?').charAt(0) }}
              </span>
              <span class="font-medium text-barkside-900">{{ t.title }}</span>
            </figcaption>

            <span
              class="pointer-events-none absolute -right-2 -top-2 h-6 w-16 rotate-14 rounded-sm bg-coral-200/80 shadow-[0_1px_2px_rgba(15,30,43,0.15)]"
              aria-hidden="true" />
          </figure>
        </div>
      </div>
    </div>

    <div
      class="torn-top absolute inset-x-0 bottom-0 h-4 rotate-180 bg-bone-50"
      aria-hidden="true" />
  </section>
</template>
