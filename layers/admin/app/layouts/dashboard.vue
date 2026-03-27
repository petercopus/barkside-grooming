<script setup lang="ts">
const { user, logout } = useAuth();
const { hasPerm } = usePermissions();

/* ─────────────────────────────────── *
 *  Main Nav
 * ─────────────────────────────────── */
const navItems = computed(() => {
  const items = [];

  if (hasPerm('booking:read:all'))
    items.push({ label: 'Appointments', icon: 'i-lucide-book-open', to: '/admin/appointments' });
  if (hasPerm('schedule:read:own'))
    items.push({ label: 'My schedule', icon: 'i-lucide-clock', to: '/admin/me/schedule' });
  if (hasPerm('service:read'))
    items.push({ label: 'Services', icon: 'i-lucide-scissors', to: '/admin/services' });
  if (hasPerm('size-category:manage'))
    items.push({ label: 'Size Categories', icon: 'i-lucide-ruler', to: '/admin/size-categories' });
  if (hasPerm('employee:read'))
    items.push({ label: 'Employees', icon: 'i-lucide-users', to: '/admin/employees' });
  if (hasPerm('role:manage'))
    items.push({ label: 'Roles', icon: 'i-lucide-shield', to: '/admin/roles' });

  if (hasPerm('settings:manage'))
    items.push({ label: 'Settings', icon: 'i-lucide-settings', to: '/admin/settings' });

  return items;
});

/* ─────────────────────────────────── *
 *  User Menu
 * ─────────────────────────────────── */
const userInfo = computed(() => ({
  name: `${user.value?.firstName ?? ''} ${user.value?.lastName ?? ''}`.trim(),
  description: user.value?.email ?? '',
  avatar: {
    src: user.value?.avatarUrl ?? '',
    alt: `${user.value?.firstName ?? ''} ${user.value?.lastName ?? ''}`.trim(),
  },
}));

const userItems = computed(() => [
  [
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/me/settings',
    },
  ],
  [
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      onSelect: () => logout(),
    },
  ],
]);
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <UDashboardSidebar>
      <template #header>
        <AppLogo />
      </template>

      <!-- Nav -->
      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        class="w-full" />

      <!-- User info
       TODO: Duplicated across customer layer. Extract to shared component w/ pluggable items -->
      <template #footer>
        <UDropdownMenu
          :items="userItems"
          :content="{
            align: 'center',
            collisionPadding: 12,
          }"
          :ui="{
            content: 'w-(--reka-dropdown-menu-trigger-width)',
          }">
          <UButton
            variant="ghost"
            class="w-full">
            <UUser
              class="text-left"
              :name="userInfo.name"
              :description="userInfo.description"
              :avatar="userInfo.avatar" />
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <!-- Main content -->
    <main class="w-full max-w-6xl mx-auto flex-1 p-6">
      <slot />
    </main>
  </div>
</template>
