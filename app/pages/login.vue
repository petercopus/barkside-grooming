<script setup lang="ts">
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui';
import { loginSchema, type LoginInput } from '~~/shared/schemas/auth';

definePageMeta({ layout: 'default' });

const { login, isLoggedIn } = useAuth();
const route = useRoute();

// if we hit this page with valid session cookie, redirect
if (isLoggedIn.value) await navigateTo('/me/home');

const fields: AuthFormField[] = [
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
];

const error = ref<string | null>(null);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<LoginInput>) {
  error.value = null;
  loading.value = true;

  try {
    await login(event.data);

    const redirect = (route.query.redirect as string) || '/me/home';
    await navigateTo(redirect);
  } catch (e: any) {
    error.value = e.data?.message || 'Invalid email or password';
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
        :schema="loginSchema"
        :fields="fields"
        :loading="loading"
        title="Welcome back"
        description="Sign in to your account"
        icon="i-lucide-log-in"
        @submit="onSubmit">
        <!-- Errors -->
        <template #validation>
          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-circle-alert"
            :title="error" />
        </template>

        <!-- Registration -->
        <template #footer>
          Don't have an account?
          <NuxtLink
            to="/register"
            class="text-primary font-medium">
            Sign up
          </NuxtLink>
        </template>
      </UAuthForm>
    </UPageCard>
  </div>
</template>
