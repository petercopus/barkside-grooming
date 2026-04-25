<script setup lang="ts">
import { team } from '~/data/team';

definePageMeta({ layout: 'site' });

useHead({ title: 'About — Barkside Grooming' });
</script>

<template>
  <div>
    <div class="pt-20 sm:pt-28 pb-10 sm:pb-16">
      <BlocksHeading
        level="page"
        heading="About Barkside"
        subheading="Passionate about pets since 2020."
        alignment="left" />
    </div>

    <div class="pt-6 sm:pt-10 pb-6 sm:pb-10">
      <BlocksTextContent
        tagline="Our story"
        headline="Built by dog people, for dog people."
        content="<p>Barkside Grooming was founded with a simple mission: make every dog feel like a star. Our team of certified groomers brings years of experience and genuine love for animals to every appointment.</p><p>We believe grooming should be a positive experience — not just for the pet parent, but for the pup too. That's why we use gentle techniques, premium products, and a calm, welcoming environment.</p>"
        alignment="left" />
    </div>

    <div class="pt-24 sm:pt-32 pb-24 sm:pb-32">
      <BlocksTeam
        title="The team"
        headline="Meet the groomers"
        content="The people who make the magic happen."
        :members="team" />
    </div>
  </div>
</template>
