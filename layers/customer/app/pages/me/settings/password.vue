<script setup lang="ts">
import { changePasswordSchema } from '~~/shared/schemas/auth';

definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const toast = useToast();

interface PasswordState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

function blank(): PasswordState {
  return { currentPassword: '', newPassword: '', confirmNewPassword: '' };
}

const state = reactive<PasswordState>(blank());
const saving = ref(false);
const errorMessage = ref<string | null>(null);

const isDirty = computed(
  () => !!(state.currentPassword || state.newPassword || state.confirmNewPassword),
);

async function onSubmit() {
  errorMessage.value = null;

  if (state.newPassword !== state.confirmNewPassword) {
    errorMessage.value = 'New passwords do not match';
    return;
  }

  saving.value = true;
  try {
    await $fetch('/api/auth/password/change', {
      method: 'POST',
      body: {
        currentPassword: state.currentPassword,
        newPassword: state.newPassword,
      },
    });

    Object.assign(state, blank());
    toast.add({ title: 'Password updated', color: 'success' });
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.statusMessage ?? 'Failed to update password';
    errorMessage.value = msg;
    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

function discard() {
  Object.assign(state, blank());
  errorMessage.value = null;
}
</script>

<template>
  <AppSectionPanel
    kicker="Account security"
    title="Password"
    description="Update the password used to sign in to your account."
    icon="i-lucide-key-round"
    :error="errorMessage">
    <UForm
      id="password-form"
      :schema="changePasswordSchema"
      :state="{ currentPassword: state.currentPassword, newPassword: state.newPassword }"
      class="space-y-5"
      @submit="onSubmit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="Current password"
          name="currentPassword"
          required
          class="sm:col-span-2">
          <UInput
            v-model="state.currentPassword"
            type="password"
            autocomplete="current-password" />
        </UFormField>

        <UFormField
          label="New password"
          name="newPassword"
          required
          hint="At least 8 characters">
          <UInput
            v-model="state.newPassword"
            type="password"
            autocomplete="new-password" />
        </UFormField>

        <UFormField
          label="Confirm new password"
          name="confirmNewPassword"
          required>
          <UInput
            v-model="state.confirmNewPassword"
            type="password"
            autocomplete="new-password" />
        </UFormField>
      </div>

      <p class="text-xs text-muted">
        For your security, every other signed-in device will be logged out
        when you change your password.
      </p>

      <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-default/60">
        <UButton
          v-if="isDirty"
          variant="ghost"
          size="sm"
          label="Discard"
          :disabled="saving"
          @click="discard" />
        <UButton
          type="submit"
          form="password-form"
          size="sm"
          icon="i-lucide-check"
          label="Update password"
          :loading="saving"
          :disabled="!isDirty" />
      </div>
    </UForm>
  </AppSectionPanel>
</template>
