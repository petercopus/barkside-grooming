<script setup lang="ts">
import type { TeamMember } from '~/data/team';

defineProps<{
  title?: string;
  headline?: string;
  content?: string;
  members: TeamMember[];
}>();

const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1557862921-37829c790f19?w=800&q=80&auto=format&fit=crop',
];

const ROTATIONS = ['-2deg', '1.8deg', '-1.3deg', '2.2deg', '-1.8deg', '1.4deg'];

function photoFor(member: TeamMember, i: number) {
  return member.image || FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length];
}
</script>

<template>
  <section class="relative cms-container sm:px-6">
    <div
      class="grid justify-items-center gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-10">
      <div
        v-for="(member, i) in members"
        :key="member.id"
        class="w-full max-w-[320px] reveal-subtle"
        :class="`delay-${Math.min(i + 1, 6)}`">
        <figure
          class="group relative flex flex-col bg-bone-50 p-3 pb-6 shadow-[0_12px_30px_-14px_rgba(15,30,43,0.3)] transition-transform duration-500 hover:-translate-y-1 hover:rotate-0!"
          :style="{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]})` }">
          <span
            class="pointer-events-none absolute -top-3 left-1/2 h-5 w-20 -translate-x-1/2 -rotate-3 rounded-sm bg-coral-200/90 shadow-[0_1px_2px_rgba(15,30,43,0.18)]"
            aria-hidden="true" />

          <div class="relative aspect-4/5 w-full overflow-hidden bg-bone-200">
            <img
              :src="photoFor(member, i)"
              :alt="member.name"
              class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              loading="lazy" />
          </div>

          <figcaption class="px-1 pt-4 text-center">
            <p class="font-display-sub text-2xl text-barkside-900">
              {{ member.name }}
            </p>

            <p class="font-hand mt-0.5 text-lg text-coral-600">{{ member.job_title }}</p>

            <p
              v-if="member.bio"
              class="mt-3 text-sm leading-relaxed text-barkside-700">
              {{ member.bio }}
            </p>
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>
