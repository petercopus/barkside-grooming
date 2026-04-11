<script setup lang="ts">
definePageMeta({
  layout: 'customer',
});

const route = useRoute();
const appointmentId = route.query.id as string;
</script>

<template>
  <div class="max-w-lg mx-auto py-12 text-center space-y-6">
    <UIcon
      name="i-lucide-circle-check"
      size="3xl"
      class="text-success mx-auto" />

    <h1 class="text-2xl font-bold">Booking Confirmed</h1>

    <p class="text-muted">
      Your appointment has been submitted and is pending confirmation.
      We'll reach out to you via email or phone to confirm.
    </p>

    <p
      v-if="appointmentId"
      class="text-sm text-muted">
      Reference: {{ appointmentId }}
    </p>

    <hr class="border-default" />

    <div class="space-y-3">
      <p class="text-sm font-medium">Want to manage your appointment online?</p>
      <UButton
        to="/register"
        size="lg"
        label="Create an Account"
        icon="i-lucide-user-plus" />
    </div>

    <UButton
      to="/home"
      variant="ghost"
      label="Back to Home" />
  </div>
</template>
