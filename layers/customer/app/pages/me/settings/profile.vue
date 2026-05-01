<script setup lang="ts">
import { updateCustomerSchema } from '~~/shared/schemas/customer';

definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const { user, fetchUser } = useAuth();
const toast = useToast();

interface ProfileState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function snapshot(): ProfileState {
  return {
    firstName: user.value?.firstName ?? '',
    lastName: user.value?.lastName ?? '',
    email: user.value?.email ?? '',
    phone: user.value?.phone ?? '',
  };
}

const state = reactive<ProfileState>(snapshot());
const initial = ref<ProfileState>(snapshot());
const saving = ref(false);
const errorMessage = ref<string | null>(null);

const isDirty = computed(() =>
  (Object.keys(state) as (keyof ProfileState)[]).some((k) => state[k] !== initial.value[k]),
);

watch(user, () => {
  Object.assign(state, snapshot());
  initial.value = snapshot();
});

async function onSubmit() {
  errorMessage.value = null;
  saving.value = true;

  try {
    await $fetch('/api/auth/me', {
      method: 'PATCH',
      body: {
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        phone: state.phone || undefined,
      },
    });

    await fetchUser();

    initial.value = snapshot();
    toast.add({ title: 'Profile updated', color: 'success' });
  } catch (err: any) {
    const msg = err?.data?.message ?? err?.statusMessage ?? 'Failed to save profile';
    errorMessage.value = msg;

    toast.add({ title: msg, color: 'error' });
  } finally {
    saving.value = false;
  }
}

function discard() {
  Object.assign(state, initial.value);
  errorMessage.value = null;
}
</script>

<template>
  <AppSectionPanel
    kicker="Your details"
    title="Profile"
    description="The basics we use to reach you about appointments."
    icon="i-lucide-user-round"
    :error="errorMessage">
    <UForm
      id="profile-form"
      :schema="updateCustomerSchema"
      :state="state"
      class="space-y-5"
      @submit="onSubmit">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField
          label="First name"
          name="firstName"
          required>
          <UInput v-model="state.firstName" />
        </UFormField>

        <UFormField
          label="Last name"
          name="lastName"
          required>
          <UInput v-model="state.lastName" />
        </UFormField>

        <UFormField
          label="Email"
          name="email"
          required
          class="sm:col-span-2">
          <UInput
            v-model="state.email"
            type="email" />
        </UFormField>

        <UFormField
          label="Phone"
          name="phone"
          class="sm:col-span-2">
          <UInput
            v-model="state.phone"
            type="tel" />
        </UFormField>
      </div>

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
          form="profile-form"
          size="sm"
          icon="i-lucide-check"
          label="Save changes"
          :loading="saving"
          :disabled="!isDirty" />
      </div>
    </UForm>
  </AppSectionPanel>
</template>
