<script setup lang="ts">
definePageMeta({ layout: 'site' });

useHead({ title: 'Booking Confirmed — Barkside Grooming' });

const route = useRoute();
const appointmentId = computed(() => route.query.id as string | undefined);

const bookingState = useBookingState();
onMounted(() => bookingState.clear());
</script>

<template>
  <section class="relative cms-container max-w-3xl py-24 sm:px-6 sm:py-32">
    <UIcon
      name="barkside:paw"
      class="pointer-events-none absolute left-1/2 top-8 h-32 w-32 -translate-x-1/2 text-coral-200 float-in"
      style="--rot: -8deg; animation-delay: 120ms"
      aria-hidden="true" />

    <div class="relative text-center reveal">
      <p class="kicker text-moss-600! delay-1 reveal-subtle">
        Confirmed &middot; tail wags incoming
      </p>
      <h1
        class="font-display-soft mt-5 text-5xl leading-[1.02] text-barkside-900 sm:text-6xl delay-2 reveal">
        You're booked!
      </h1>

      <p
        class="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-barkside-700 delay-3 reveal-subtle">
        We'll send a reminder 24 hours before your appointment. Can't wait to meet your pup.
      </p>

      <div
        v-if="appointmentId"
        class="mx-auto mt-8 inline-flex items-center gap-3 rounded-full border border-bone-300 bg-bone-100 px-5 py-2 delay-4 reveal-subtle">
        <span class="text-xs uppercase tracking-wider text-barkside-600">Reference</span>
        <span class="font-mono text-sm font-medium text-barkside-900">{{ appointmentId }}</span>
      </div>

      <div class="mx-auto mt-12 flex max-w-xs items-center gap-4 delay-5 reveal-subtle">
        <span class="h-px flex-1 bg-bone-300" />
        <span class="font-hand text-sm text-coral-600">one more thing</span>
        <span class="h-px flex-1 bg-bone-300" />
      </div>

      <div class="mt-6 space-y-4 delay-6 reveal-subtle">
        <p class="mx-auto max-w-md text-barkside-700">
          Create an account so booking next time takes about 30 seconds.
        </p>
        <NuxtLink
          to="/register"
          class="group inline-flex items-center gap-3 rounded-full bg-barkside-900 px-7 py-3.5 text-bone-50 transition-all duration-200 hover:-translate-y-0.5 hover:bg-barkside-800">
          <UIcon
            name="i-lucide-user-plus"
            class="h-4 w-4" />
          <span class="font-medium">Save your pup for next time?</span>
        </NuxtLink>
      </div>

      <div class="mt-12 space-y-2 delay-7 reveal-subtle">
        <NuxtLink
          to="/"
          class="link-editorial inline-flex items-center gap-1.5 text-sm font-medium">
          <UIcon
            name="i-lucide-arrow-left"
            class="h-3.5 w-3.5" />
          <span>Back home</span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
