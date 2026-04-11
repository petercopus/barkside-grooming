<script setup lang="ts">
const { user, logout, isLoggedIn } = useAuth();

const menuOpen = ref(false);

function logoutAndClose() {
  menuOpen.value = false;
  logout();
}

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
      label: 'My Pets',
      icon: 'i-lucide-paw-print',
      to: '/me/pets',
    },
    {
      label: 'Appointments',
      icon: 'i-lucide-calendar',
      to: '/me/appointments',
    },
    {
      label: 'Documents',
      icon: 'i-lucide-file-text',
      to: '/me/documents',
    },
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
      onSelect: () => logoutAndClose(),
    },
  ],
]);

/* ─────────────────────────────────── *
 *  Main Nav
 * ─────────────────────────────────── */
const homeItem = [{ icon: 'i-lucide-house', to: '/home' }];
const navItems = [{ label: 'Book Now', icon: 'i-lucide-book-open', to: '/book' }];

const mobileNavItems = computed(() => {
  if (!isLoggedIn.value) {
    return [...navItems, { label: 'Login', icon: 'i-lucide-log-in', to: '/login' }];
  }

  return [
    ...navItems,
    { label: 'My Pets', icon: 'i-lucide-paw-print', to: '/me/pets' },
    { label: 'Appointments', icon: 'i-lucide-calendar', to: '/me/appointments' },
    { label: 'Documents', icon: 'i-lucide-file-text', to: '/me/documents' },
    { label: 'Settings', icon: 'i-lucide-settings', to: '/me/settings' },
    { label: 'Logout', icon: 'i-lucide-log-out', onSelect: () => logoutAndClose() },
  ];
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Top navbar -->
    <UHeader v-model:open="menuOpen">
      <template #title>
        <AppLogo />
      </template>

      <!-- Main navigation -->
      <div class="flex items-center">
        <UNavigationMenu
          :items="homeItem"
          trailing-icon="i-lucide-ellipses-vertical" />
        <UIcon
          name="i-lucide-ellipsis-vertical"
          size="2xl"
          class="text-muted" />
        <UNavigationMenu :items="navItems" />
      </div>

      <template #right>
        <!-- Notifications -->
        <AppNotificationBell v-if="isLoggedIn" />

        <!-- Auth'd user menu -->
        <UDropdownMenu
          v-if="isLoggedIn"
          class="hidden lg:block"
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
            class="justify-start">
            <UUser
              class="text-left"
              :name="userInfo.name"
              :description="userInfo.description"
              :avatar="userInfo.avatar" />
          </UButton>
        </UDropdownMenu>

        <!-- Login button -->
        <UButton
          v-else
          class="hidden lg:flex"
          to="/login"
          icon="i-lucide-log-in"
          label="Login"
          variant="ghost" />
      </template>

      <template #body>
        <UNavigationMenu
          :items="mobileNavItems"
          orientation="vertical"
          class="-mx-2.5" />
      </template>
    </UHeader>

    <!-- Main content -->
    <main class="w-full max-w-6xl mx-auto flex-1 p-6">
      <slot />
    </main>

    <!-- Notification drawer -->
    <AppNotificationDrawer />
  </div>
</template>
