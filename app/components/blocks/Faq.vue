<script setup lang="ts">
const props = defineProps<{
  headline?: string;
  tagline?: string;
  faqs: { question: string; answer: string }[];
}>();

const openIndex = ref<number | null>(0);

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i;
}
</script>

<template>
  <section class="cms-container sm:px-6">
    <div class="grid gap-12 md:grid-cols-12 md:gap-16">
      <div class="md:col-span-5 lg:col-span-4">
        <div class="md:sticky md:top-28">
          <p class="kicker reveal-subtle">{{ tagline || 'FAQ' }}</p>

          <h2
            class="font-display-soft mt-4 text-5xl leading-[1.04] text-barkside-900 sm:text-6xl delay-1 reveal">
            {{ headline || 'Frequently barked questions' }}
          </h2>

          <p class="mt-6 max-w-sm text-barkside-700 delay-2 reveal-subtle">
            Still curious? Call the salon — we love talking dogs.
          </p>

          <NuxtLink
            to="/contact"
            class="link-editorial mt-4 inline-flex items-center gap-1.5 text-sm font-medium delay-3 reveal-subtle">
            <span>Get in touch</span>
            <UIcon
              name="i-lucide-arrow-right"
              class="h-3.5 w-3.5" />
          </NuxtLink>
        </div>
      </div>

      <div class="md:col-span-7 lg:col-span-8">
        <ul class="divide-y divide-bone-300/80 border-y border-bone-300/80">
          <li
            v-for="(item, i) in faqs"
            :key="i"
            class="reveal-subtle"
            :class="`delay-${Math.min(i + 1, 6)}`">
            <button
              type="button"
              class="group flex w-full items-start gap-6 py-7 text-left"
              :aria-expanded="openIndex === i"
              @click="toggle(i)">
              <span class="font-display-caption shrink-0 text-lg italic text-coral-600 sm:text-xl">
                {{ String(i + 1).padStart(2, '0') }}
              </span>
              <span
                class="font-display-sub flex-1 text-2xl leading-tight text-barkside-900 transition-colors group-hover:text-coral-700 sm:text-[1.8rem]">
                {{ item.question }}
              </span>
              <span
                class="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-barkside-900/20 text-barkside-900 transition-transform duration-300"
                :class="
                  openIndex === i ? 'rotate-45 bg-coral-500 text-bone-50 border-coral-500' : ''
                ">
                <UIcon
                  name="i-lucide-plus"
                  class="h-4 w-4" />
              </span>
            </button>
            <div
              class="grid transition-[grid-template-rows] duration-400 ease-out"
              :style="{
                gridTemplateRows: openIndex === i ? '1fr' : '0fr',
              }">
              <div class="overflow-hidden">
                <p
                  class="ml-10 max-w-2xl pb-7 text-[1.05rem] leading-relaxed text-barkside-700 sm:ml-16">
                  {{ item.answer }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
