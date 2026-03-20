/**
 * Central auth
 * - Manages current user state + auth actions
 * - All methods call server/api/auth routes
 */

import type { LoginInput, RegisterInput } from '~~/shared/schemas/auth';

// Shape me.get.ts returns
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
}

export function useAuth() {
  // reactive refs for persisting across SSR and client
  const user = useState<AuthUser | null>('auth-user', () => null);
  const permissions = useState<string[]>('auth-permissions', () => []);

  // simple login check
  const isLoggedIn = computed(() => user.value !== null);

  /**
   * Fetch current user from /api/auth/me
   * - Called on app init in order to restore session
   * - SSR note: cookie forwarded automatically via useFetch
   */
  async function fetchUser() {
    try {
      // using useFetch over $fetch here because this is not a user triggered action
      // useFetch compatible with SSR and auto forwards cookie
      const { data } = await useFetch<{ user: AuthUser; permissions: string[] }>('/api/auth/me');

      if (data.value) {
        user.value = data.value.user;
        permissions.value = data.value.permissions;
      }
    } catch {
      // not auth'd
      user.value = null;
      permissions.value = [];
    }
  }

  /**
   * Register new user
   * - Server returns session cookie
   */
  async function register(input: RegisterInput) {
    const data = await $fetch('/api/auth/register', {
      method: 'POST',
      body: input,
    });

    // after registration we have to get permissions because the registration response only returns user
    // fetchUser will hydrate our reactive refs
    await fetchUser();

    return data;
  }

  /**
   *
   * Login user
   * - Server returns session cookie
   */
  async function login(input: LoginInput) {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: input,
    });

    // same as refresh. Server sets cookie, we need to refresh state.
    await fetchUser();

    return data;
  }

  /**
   * Logout user
   * - Server deletes session from DB and clears cookie
   */
  async function logout() {
    await $fetch('/api/auth/logout', {
      method: 'POST',
    });

    // clear state immediately
    user.value = null;
    permissions.value = [];

    await navigateTo('/home');
  }

  return {
    user,
    permissions,
    isLoggedIn,
    fetchUser,
    register,
    login,
    logout,
  };
}
