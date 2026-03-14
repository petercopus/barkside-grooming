<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui';
import { registerSchema, type RegisterInput } from '~~/shared/schemas/auth';

definePageMeta({ layout: 'default' });

const { register, isLoggedIn } = useAuth();

// if we hit this page with valid session cookie, redirect
if (isLoggedIn.value) await navigateTo('/me/home');

const fields: AuthFormField[] = [
  {
    name: 'firstName',
    type: 'text',
    label: 'First name',
    placeholder: '',
    required: true,
  },
  {
    name: 'lastName',
    type: 'text',
    label: 'Last name',
    placeholder: '',
    required: true,
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: '',
    required: true,
  },
  {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: '',
    required: true,
  },
  {
    name: 'phone',
    type: 'tel',
    label: 'Phone',
    placeholder: '',
  },
];

const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<RegisterInput>) {
  error.value = null;
  loading.value = true;

  try {
    await register(event.data);
    await navigateTo('/me/home');
  } catch (e: any) {
    error.value = e.data?.message || 'Registration failed';
  } finally {
    // clear loading val regardless of success
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen px-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :schema="registerSchema"
        :fields="fields"
        :loading="loading"
        title="Create an account"
        description="Get started with Barkside Grooming"
        icon="i-lucide-user-plus"
        @submit="onSubmit">
        <!-- Errors -->
        <template #validation>
          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-alert-circle"
            :title="error" />
        </template>

        <!-- Login -->
        <template #footer>
          Already have an account?
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
