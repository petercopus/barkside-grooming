/**
 * Permission middleware
 */

export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth();
  const { hasPerm } = usePermissions();

  if (!user.value) await fetchUser();
  if (!user.value) return navigateTo({ path: '/login', query: { redirect: to.fullPath } });

  const required = to.meta.permission as string | undefined;
  if (required && !hasPerm(required)) return navigateTo('/me/home');
});
