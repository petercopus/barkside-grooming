<script setup lang="ts">
import { faqs } from '~/data/faqs';

definePageMeta({ layout: 'site' });

useHead({ title: 'Services — Barkside Grooming' });
</script>

<template>
  <div>
    <div class="pt-20 sm:pt-28 pb-10 sm:pb-16">
      <BlocksHeading
        level="page"
        heading="Tail-wagging services"
        subheading="Everything your pup needs to look and feel their best — from bath & brush to full breed-specific styling."
        kicker="The menu"
        alignment="left" />
    </div>

    <div class="pt-6 sm:pt-10 pb-20 sm:pb-28">
      <BlocksServicesHighlight
        :show-pricing="true"
        :show-duration="true" />
    </div>

    <div class="pt-20 sm:pt-28 pb-20 sm:pb-28">
      <BlocksFaq
        headline="Common questions"
        :faqs="faqs" />
    </div>
  </div>
</template>
