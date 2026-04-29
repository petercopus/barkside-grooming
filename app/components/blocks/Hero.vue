<script setup lang="ts">
const props = defineProps<{
  title?: string;
  headline?: string;
  content?: string;
  image?: string;
}>();

const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1800&q=85&auto=format&fit=crop';

const bgUrl = computed(() => props.image || DEFAULT_HERO);
const kicker = computed(() => props.title || 'Barkside Grooming Co.');
const headlineHtml = computed(
  () => props.headline ?? 'Your pup deserves <em>the star treatment.</em>',
);
</script>

<template>
  <section class="relative isolate overflow-hidden bg-bone-50 min-h-195">
    <img
      :src="bgUrl"
      alt=""
      class="absolute inset-0 h-full w-full object-cover"
      style="animation: pan-image 2200ms cubic-bezier(0.22, 1, 0.36, 1) both" />

    <div
      class="absolute inset-0 bg-linear-to-r from-barkside-950/88 via-barkside-950/55 to-transparent sm:via-barkside-950/40" />

    <div class="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-bone-50/40 to-transparent" />

    <div
      class="absolute inset-0 bg-barkside-900"
      style="opacity: 0.18" />

    <div class="grain absolute inset-0 opacity-20 mix-blend-overlay" />

    <div class="relative z-10 cms-container flex h-full flex-col py-20 sm:px-6">
      <div class="mt-auto max-w-3xl reveal">
        <p class="kicker text-coral-300! delay-1 reveal-subtle">{{ kicker }}</p>

        <h1
          class="font-display-soft mt-5 text-[clamp(2.75rem,7vw,6.25rem)] font-medium leading-[0.95] text-bone-50 delay-2 reveal"
          v-html="headlineHtml" />

        <p
          v-if="content"
          class="mt-6 max-w-xl text-lg leading-relaxed text-bone-100/90 delay-3 reveal-subtle sm:text-xl">
          {{ content }}
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-4 delay-4 reveal-subtle">
          <UButton
            to="/book"
            variant="editorial"
            color="secondary">
            Book a groom
            <template #trailing>
              <AppCtaArrow variant="light" />
            </template>
          </UButton>

          <NuxtLink
            to="/services"
            class="inline-flex items-center gap-2 text-bone-50/90 hover:text-coral-300 transition-colors">
            <span class="font-hand text-xl">see the menu</span>

            <UIcon
              name="i-lucide-arrow-down-right"
              class="h-5 w-5" />
          </NuxtLink>
        </div>
      </div>

      <div
        class="pointer-events-none mt-16 flex items-center gap-6 text-sm text-bone-100/70 delay-5 reveal-subtle">
        <div class="flex items-center gap-2">
          <span class="inline-block h-2 w-2 rounded-full bg-coral-400" />
          <span class="font-medium">Open Tue-Sun</span>
        </div>

        <span class="hidden h-px w-12 bg-bone-100/30 sm:block" />

        <div class="hidden items-center gap-2 sm:flex">
          <span class="inline-block h-2 w-2 rounded-full bg-coral-400" />
          <span>All breeds, all temperaments</span>
        </div>

        <span class="hidden h-px w-12 bg-bone-100/30 lg:block" />

        <div class="hidden items-center gap-2 lg:flex">
          <span class="inline-block h-2 w-2 rounded-full bg-coral-400" />
          <span>Spa-grade products</span>
        </div>
      </div>
    </div>
  </section>
</template>
