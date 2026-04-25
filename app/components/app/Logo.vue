<script setup lang="ts">
import logoSrc from '~/assets/img/barkside_logo_small.png';

withDefaults(
  defineProps<{
    variant?: 'light' | 'dark';
  }>(),
  { variant: 'light' },
);
</script>

<template>
  <NuxtLink
    to="/"
    class="group flex items-center gap-2.5">
    <span
      class="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-bone-50 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_6px_rgba(15,30,43,0.18)] transition-transform duration-300 group-hover:-rotate-6">
      <img
        :src="logoSrc"
        alt="Barkside Grooming"
        class="h-full w-full object-cover" />
    </span>
    <span class="flex flex-col leading-[0.95]">
      <span
        class="font-display text-[1.45rem] font-semibold"
        :class="variant === 'dark' ? 'text-bone-50' : 'text-barkside-900'"
        style="
          font-variation-settings:
            'opsz' 144,
            'SOFT' 100,
            'WONK' 1;
        ">
        Barkside
      </span>
      <span
        class="font-hand -mt-0.5 text-[1rem]"
        :class="variant === 'dark' ? 'text-coral-300' : 'text-coral-600'">
        grooming co.
      </span>
    </span>
  </NuxtLink>
</template>
