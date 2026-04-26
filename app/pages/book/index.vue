<script setup lang="ts">
definePageMeta({ layout: 'site' });

useHead({ title: 'Book an Appointment — Barkside Grooming' });
</script>

<template>
  <div>
    <div class="pt-20 sm:pt-28 pb-10 sm:pb-16">
      <BlocksHeading
        level="page"
        heading="Book your pup in"
        kicker="Booking"
        alignment="center" />
    </div>

    <section class="relative cms-container max-w-6xl sm:px-6 pb-16 sm:pb-24">
      <div
        class="relative rounded-card-lg border border-bone-300/80 bg-bone-50 p-8 shadow-[0_20px_60px_-30px_rgba(15,30,43,0.25)] sm:p-10 delay-4 reveal-subtle">
        <BookingFlow
          :guest-checkout-enabled="true"
          submit-button-text="Confirm & book"
          :step-labels="[
            { label: 'Your pup' },
            { label: 'Services' },
            { label: 'Pick a time' },
            { label: 'Finalize' },
          ]"
          :show-progress-bar="true" />
      </div>
    </section>
  </div>
</template>
