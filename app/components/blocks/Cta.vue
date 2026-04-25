<script setup lang="ts">
defineProps<{
  title?: string;
  headline?: string;
  description?: string;
}>();
</script>

<template>
  <section class="cms-container sm:px-6">
    <div
      class="relative overflow-hidden rounded-hero bg-barkside-950 text-bone-50 px-8 py-20 sm:px-16 sm:py-28 reveal-subtle">
      <div class="pointer-events-none absolute inset-x-0 -bottom-16 overflow-hidden opacity-10">
        <p
          class="font-display-soft select-none whitespace-nowrap text-center text-[22vw] leading-[0.85]">
          hello
        </p>
      </div>

      <UIcon
        name="barkside:paw"
        class="absolute right-8 top-8 h-16 w-16 opacity-40"
        aria-hidden="true" />

      <div class="relative mx-auto max-w-3xl text-center">
        <p
          v-if="title"
          class="kicker mb-4 text-coral-300!">
          {{ title }}
        </p>

        <h2 class="font-display-soft text-5xl leading-[1.02] text-bone-50 sm:text-6xl lg:text-7xl">
          {{ headline || 'Ready when you are' }}
        </h2>

        <p
          v-if="description"
          class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-bone-100/80">
          {{ description }}
        </p>

        <div class="mt-10 flex justify-center">
          <UButton
            to="/book"
            variant="editorial"
            color="secondary">
            Book a groom
            <template #trailing>
              <AppCtaArrow variant="outline" />
            </template>
          </UButton>
        </div>
      </div>
    </div>
  </section>
</template>
