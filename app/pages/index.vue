<script setup lang="ts">
definePageMeta({ layout: 'default' });

const { isLoggedIn } = useAuth();

// if we hit this page with valid session cookie, redirect
if (isLoggedIn.value) await navigateTo('/home');
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen px-4 text-center">
    <h1 class="text-4xl font-bold">Barkside Grooming</h1>
    <p class="mt-3 text-lg text-muted max-w-md">
      Lorem ipsum dolor sit amet consectetur adipisicing.
    </p>

    <div class="flex gap-3 mt-8">
      <UButton
        to="/register"
        size="lg">
        Get Started
      </UButton>
      <UButton
        to="/login"
        variant="outline"
        size="lg">
        Sign In
      </UButton>
    </div>
  </div>
</template>
