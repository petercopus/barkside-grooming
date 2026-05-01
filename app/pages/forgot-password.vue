<script setup lang="ts">
import type { AuthFormField, FormSubmitEvent } from '@nuxt/ui';
import { forgotPasswordSchema, type ForgotPasswordInput } from '~~/shared/schemas/auth';

definePageMeta({ layout: 'default' });

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: '',
    required: true,
  },
];

const error = ref<string | null>(null);
const loading = ref(false);
const sent = ref(false);

async function onSubmit(event: FormSubmitEvent<ForgotPasswordInput>) {
  error.value = null;
  loading.value = true;

  try {
    await $fetch('/api/auth/password/forgot', {
      method: 'POST',
      body: event.data,
    });

    sent.value = true;
  } catch (e: any) {
    error.value = e.data?.message || 'Could not send reset email. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen px-4">
    <UPageCard class="w-full max-w-md">
      <div
        v-if="sent"
        class="text-center py-2">
        <UIcon
          name="i-lucide-mail-check"
          class="size-10 text-primary mx-auto mb-3" />

        <h2 class="text-lg font-semibold text-default">Check your email</h2>
        <p class="text-sm text-muted mt-2">
          If an account exists for that email, we've sent a link you can use to reset your password.
          The link expires in one hour.
        </p>

        <NuxtLink
          to="/login"
          class="text-primary font-medium text-sm inline-block mt-5">
          Back to sign in
        </NuxtLink>
      </div>

      <UAuthForm
        v-else
        :schema="forgotPasswordSchema"
        :fields="fields"
        :loading="loading"
        title="Reset your password"
        description="Enter your email and we'll send you a reset link."
        icon="i-lucide-key-round"
        :submit="{ label: 'Send reset link' }"
        @submit="onSubmit">
        <template #validation>
          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-circle-alert"
            :title="error" />
        </template>

        <template #footer>
          Remembered it?
          <NuxtLink
            to="/login"
            class="text-primary font-medium">
            Sign in
          </NuxtLink>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
