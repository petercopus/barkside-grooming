/**
 * Auth plugin
 * - Runs on app init (SSR+client)
 * - Important to populate useAuth().user on boot BEFORE middleware tries to access it
 */

export default defineNuxtPlugin(async () => {
  const { fetchUser } = useAuth();
  await fetchUser();
});
