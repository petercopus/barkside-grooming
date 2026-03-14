/**
 * Auth middleware
 * - Protects pages that require authentication
 *
 * - Usage: definePageMeta({ middleware: 'auth' });
 */

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth();

  // no user loaded, try to fetch from /api/auth/me
  if (!user.value) await fetchUser();

  // if still no user, then not authenticated
  if (!user.value) {
    // TODO: redirect ro login page
  }
});
