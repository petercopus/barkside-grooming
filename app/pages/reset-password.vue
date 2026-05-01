<script setup lang="ts">
definePageMeta({ layout: 'default' });

const route = useRoute();
const toast = useToast();
const token = computed(() => (route.query.token as string | undefined) ?? '');

const state = reactive({
  newPassword: '',
  confirmNewPassword: '',
});

const error = ref<string | null>(null);
const loading = ref(false);
const done = ref(false);

const tokenMissing = computed(() => !token.value);

async function onSubmit() {
  error.value = null;

  if (state.newPassword.length < 8) {
    error.value = 'Password must be at least 8 characters';
    return;
  }

  if (state.newPassword !== state.confirmNewPassword) {
    error.value = 'Passwords do not match';
    return;
  }

  loading.value = true;
  try {
    await $fetch('/api/auth/password/reset', {
      method: 'POST',
      body: { token: token.value, newPassword: state.newPassword },
    });

    done.value = true;

    toast.add({ title: 'Password updated', color: 'success' });
  } catch (e: any) {
    error.value =
      e.data?.message ?? 'This reset link is invalid or has expired. Please request a new one.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen px-4">
    <UPageCard class="w-full max-w-md">
      <!-- token missing -->
      <div
        v-if="tokenMissing"
        class="text-center py-2">
        <UIcon
          name="i-lucide-link-2-off"
          class="size-10 text-muted mx-auto mb-3" />

        <h2 class="text-lg font-semibold text-default">Reset link missing</h2>
        <p class="text-sm text-muted mt-2">This page needs a valid reset link from your email.</p>

        <NuxtLink
          to="/forgot-password"
          class="text-primary font-medium text-sm inline-block mt-5">
          Request a new link
        </NuxtLink>
      </div>

      <!-- done -->
      <div
        v-else-if="done"
        class="text-center py-2">
        <UIcon
          name="i-lucide-check-circle-2"
          class="size-10 text-primary mx-auto mb-3" />

        <h2 class="text-lg font-semibold text-default">Password updated</h2>
        <p class="text-sm text-muted mt-2">
          Your password has been changed. Sign in with your new password to continue.
        </p>

        <UButton
          to="/login"
          class="mt-5"
          label="Sign in"
          icon="i-lucide-log-in" />
      </div>

      <!-- form -->
      <div v-else>
        <div class="text-center mb-6">
          <UIcon
            name="i-lucide-key-round"
            class="size-9 text-primary mx-auto mb-2" />

          <h1 class="text-xl font-semibold text-default">Choose a new password</h1>
          <p class="text-sm text-muted mt-1">Pick something at least 8 characters long.</p>
        </div>

        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-alert"
          :title="error"
          class="mb-4" />

        <UForm
          id="reset-form"
          :state="state"
          class="space-y-4"
          @submit="onSubmit">
          <UFormField
            label="New password"
            name="newPassword"
            required>
            <UInput
              v-model="state.newPassword"
              type="password" />
          </UFormField>

          <UFormField
            label="Confirm new password"
            name="confirmNewPassword"
            required>
            <UInput
              v-model="state.confirmNewPassword"
              type="password" />
          </UFormField>

          <UButton
            type="submit"
            form="reset-form"
            block
            label="Update password"
            :loading="loading" />
        </UForm>

        <p class="text-center text-sm text-muted mt-5">
          <NuxtLink
            to="/login"
            class="text-primary font-medium">
            Back to sign in
          </NuxtLink>
        </p>
      </div>
    </UPageCard>
  </div>
</template>
