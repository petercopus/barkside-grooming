<script setup lang="ts">
const props = defineProps<{
  showPricing?: boolean;
  showDuration?: boolean;
  maxItems?: number;
  ctaText?: string;
  ctaLink?: string;
}>();

interface ServicePricing {
  priceCents: number;
  durationMinutes: number;
  sizeCategoryId?: number;
}
interface Service {
  id: number;
  name: string;
  description?: string;
  category?: string;
  isAddon?: boolean;
  image_url?: string;
  pricing?: ServicePricing[];
}

const { data: res } = await useFetch<{ services: Service[] }>('/api/services');

const displayServices = computed<Service[]>(() => {
  const list = (res.value?.services ?? []).filter(
    (s) => !s.isAddon && (s.pricing?.length ?? 0) > 0,
  );

  const max = props.maxItems ?? 0;

  return max > 0 ? list.slice(0, max) : list;
});

const hasResults = computed(() => displayServices.value.length > 0);

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1587764379873-97837921fd44?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=1200&q=80&auto=format&fit=crop',
];

function imageForService(service: Service, index: number): string {
  if (service.image_url) return service.image_url;
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]!;
}

function priceLabel(service: Service): string | null {
  const prices = (service.pricing ?? [])
    .map((p) => p.priceCents)
    .filter((p): p is number => Number.isFinite(p));
  if (!prices.length) return null;
  const min = Math.round(Math.min(...prices) / 100);
  return `from $${min}`;
}

function durationLabel(service: Service): string | null {
  const durs = (service.pricing ?? [])
    .map((p) => p.durationMinutes)
    .filter((d): d is number => Number.isFinite(d));
  if (!durs.length) return null;
  const min = Math.min(...durs);
  const max = Math.max(...durs);
  return min === max ? `${min} min` : `${min}–${max} min`;
}
</script>

<template>
  <section class="relative cms-container sm:px-6">
    <div
      v-if="hasResults"
      class="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-7">
      <article
        v-for="(service, i) in displayServices"
        :key="service.id"
        class="group relative flex flex-col overflow-hidden rounded-card bg-bone-100 reveal-subtle"
        :class="[i % 2 === 1 ? 'md:translate-y-10' : '', `delay-${Math.min(i + 1, 6)}`]">
        <div class="relative aspect-5/4 w-full overflow-hidden">
          <img
            :src="imageForService(service, i)"
            :alt="service.name"
            class="absolute inset-0 h-full w-full object-cover transition-transform duration-900 ease-out group-hover:scale-[1.05]"
            loading="lazy" />
          <div
            class="absolute inset-0 bg-linear-to-t from-barkside-950/70 via-barkside-950/10 to-transparent" />

          <div
            v-if="showPricing && priceLabel(service)"
            class="absolute right-5 top-5 rotate-3 rounded-full bg-bone-50 px-4 py-1.5 text-sm font-semibold text-barkside-900 shadow-[0_6px_18px_rgba(15,30,43,0.22)] transition-transform duration-300 group-hover:rotate-0 group-hover:scale-[1.04]">
            {{ priceLabel(service) }}
          </div>

          <div class="absolute left-5 top-5 flex items-center gap-2.5 text-bone-50">
            <span class="font-display-caption italic text-sm">
              No. {{ String(i + 1).padStart(2, '0') }}
            </span>
            <span class="h-px w-6 bg-bone-50/50" />
            <span
              v-if="service.category"
              class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-bone-50/90">
              {{ service.category }}
            </span>
          </div>

          <div class="absolute inset-x-5 bottom-5">
            <h3 class="font-display-sub text-3xl leading-tight text-bone-50 sm:text-4xl">
              {{ service.name }}
            </h3>
          </div>
        </div>

        <div class="flex flex-1 flex-col gap-4 p-6 sm:p-7">
          <p
            v-if="service.description"
            class="text-[0.95rem] leading-relaxed text-barkside-700">
            {{ service.description }}
          </p>

          <div class="mt-auto flex flex-wrap items-center justify-between gap-3">
            <span
              v-if="showDuration && durationLabel(service)"
              class="inline-flex items-center gap-1.5 rounded-full bg-bone-50 px-4 py-1.5 text-xs font-medium text-barkside-800">
              <UIcon
                name="i-lucide-clock"
                class="h-3.5 w-3.5 text-coral-500" />
              {{ durationLabel(service) }}
            </span>

            <NuxtLink
              to="/book"
              class="link-editorial inline-flex items-center gap-1.5 text-sm font-medium"
              :aria-label="`Book ${service.name}`">
              <span>Book this</span>
              <UIcon
                name="i-lucide-arrow-right"
                class="h-3.5 w-3.5" />
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>

    <div
      v-else
      class="rounded-card border border-dashed border-bone-300 bg-bone-100 px-8 py-20 text-center">
      <p class="font-hand text-2xl text-coral-600">Services coming soon...</p>
    </div>

    <div
      v-if="ctaText"
      class="mt-16 flex justify-center">
      <UButton
        :to="ctaLink"
        variant="editorial"
        color="neutral">
        {{ ctaText }}
        <template #trailing>
          <AppCtaArrow variant="dark" />
        </template>
      </UButton>
    </div>
  </section>
</template>
