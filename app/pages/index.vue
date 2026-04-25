<script setup lang="ts">
import { testimonials } from '~/data/testimonials';

definePageMeta({ layout: 'site' });

useHead({ title: 'Barkside Grooming — Where every pup gets the star treatment' });
</script>

<template>
  <div>
    <BlocksHero
      title="Barkside Grooming Co."
      headline="Your pup deserves <em>the star treatment.</em>"
      content="Professional grooming with love, care, and tail wags guaranteed. Small-batch service for dogs who deserve better than a production line." />

    <div class="pt-20 sm:pt-28 pb-10 sm:pb-16">
      <BlocksHeading
        level="section"
        heading="Tail-wagging services"
        subheading="From bath & brush to full breed-specific styling, we've got your pup covered."
        alignment="left" />
    </div>

    <div class="pt-6 sm:pt-10 pb-20 sm:pb-28">
      <BlocksServicesHighlight
        :show-pricing="true"
        :show-duration="true"
        :max-items="4"
        cta-text="View all services"
        cta-link="/services" />
    </div>

    <BlocksTestimonials
      headline="What pet parents say"
      tagline="Wagging Endorsements"
      :testimonials="testimonials" />

    <div class="pt-16 sm:pt-24 pb-16 sm:pb-24">
      <BlocksCta
        title="Ready?"
        headline="Ready to pamper your pup?"
        description="Book an appointment today and see the Barkside difference." />
    </div>
  </div>
</template>
