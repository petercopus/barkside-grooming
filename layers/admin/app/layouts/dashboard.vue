<script setup lang="ts">
const route = useRoute();
const { user, logout } = useAuth();
const { hasPerm } = usePermissions();

/* ─────────────────────────────────── *
 *  Main Nav
 * ─────────────────────────────────── */
const navItems = computed(() => {
  const items = [];

  items.push({ label: 'Home', icon: 'i-lucide-house', to: '/admin/home' });

  if (hasPerm('booking:read:all')) {
    items.push({ label: 'Appointments', icon: 'i-lucide-book-open', to: '/admin/appointments' });
  }

  // if (hasPerm('schedule:read:own')) {
  //   items.push({ label: 'My schedule', icon: 'i-lucide-clock', to: '/admin/me/schedule' });
  // }

  const settingsChildren = [];
  if (hasPerm('service:read')) {
    settingsChildren.push({
      label: 'Services',
      to: '/admin/settings/services',
      active: route.path.startsWith('/admin/settings/services'),
    });
  }

  if (hasPerm('size-category:read')) {
    settingsChildren.push({
      label: 'Size Categories',
      to: '/admin/settings/size-categories',
      active: route.path.startsWith('/admin/settings/size-categories'),
    });
  }

  if (hasPerm('employee:read')) {
    settingsChildren.push({
      label: 'Employees',
      to: '/admin/settings/employees',
      active: route.path.startsWith('/admin/settings/employees'),
    });
  }

  if (hasPerm('role:read')) {
    settingsChildren.push({
      label: 'Roles',
      to: '/admin/settings/roles',
      active: route.path.startsWith('/admin/settings/roles'),
    });
  }

  if (settingsChildren.length > 0) {
    items.push({
      label: 'Settings',
      icon: 'i-lucide-settings',
      children: settingsChildren,
      defaultOpen: true,
    });
  }

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
