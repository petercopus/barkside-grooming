<script setup lang="ts">
definePageMeta({ layout: 'site' });

useHead({ title: 'Contact — Barkside Grooming' });
</script>

<template>
  <div>
    <div class="pt-20 sm:pt-28 pb-10 sm:pb-16">
      <BlocksHeading
        level="page"
        heading="Drop us a line."
        subheading="Learn about grooming, ask about a shy rescue, or just send us a snapshot of your good boy. We read every note — usually over the first coffee of the morning."
        alignment="left" />
    </div>

    <div class="pt-6 sm:pt-10 pb-16 sm:pb-24">
      <BlocksContactInfo />
    </div>
  </div>
</template>
