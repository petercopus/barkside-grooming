<script setup lang="ts">
const route = useRoute();
const { user, logout } = useAuth();
const { hasPerm } = usePermissions();

/* ─────────────────────────────────── *
 * Main Nav
 * ─────────────────────────────────── */
const navItems = computed(() => {
  const items = [];

  items.push({ label: 'Home', icon: 'i-lucide-house', to: '/admin' });

  if (hasPerm('booking:read:all')) {
    items.push({ label: 'Appointments', icon: 'i-lucide-book-open', to: '/admin/appointments' });
  }

  if (hasPerm('customer:read')) {
    items.push({ label: 'Customers', icon: 'i-lucide-contact', to: '/admin/customers' });
  }

  if (hasPerm('pet:read:all')) {
    items.push({ label: 'Pets', icon: 'i-lucide-paw-print', to: '/admin/pets' });
  }

  if (hasPerm('document:read:all')) {
    items.push({ label: 'Documents', icon: 'i-lucide-file-text', to: '/admin/documents' });
  }

  if (hasPerm('document:request')) {
    items.push({
      label: 'Document Requests',
      icon: 'i-lucide-file-question',
      to: '/admin/document-requests',
    });
  }

  if (hasPerm('reports:view')) {
    items.push({ label: 'Reports', icon: 'i-lucide-bar-chart-3', to: '/admin/reports' });
  }

  const settingsChildren = [];
  if (hasPerm('service:manage')) {
    settingsChildren.push({
      label: 'Services',
      to: '/admin/settings/services',
      active: route.path.startsWith('/admin/settings/services'),
    });
    settingsChildren.push({
      label: 'Bundles',
      to: '/admin/settings/bundles',
      active: route.path.startsWith('/admin/settings/bundles'),
    });
  }

  if (hasPerm('size-category:manage')) {
    settingsChildren.push({
      label: 'Size Categories',
      to: '/admin/settings/size-categories',
      active: route.path.startsWith('/admin/settings/size-categories'),
    });
  }

  if (hasPerm('employee:manage')) {
    settingsChildren.push({
      label: 'Employees',
      to: '/admin/settings/employees',
      active: route.path.startsWith('/admin/settings/employees'),
    });
  }

  if (hasPerm('role:manage')) {
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
 * User Menu
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
  <UDashboardGroup class="flex min-h-screen">
    <!-- Sidebar -->
    <UDashboardSidebar :ui="{ root: 'lg:min-w-64' }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <AppLogo />
          <AppNotificationBell />
        </div>
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
    <main class="flex-1 overflow-y-auto">
      <div class="w-full p-6">
        <UDashboardSidebarToggle class="lg:hidden mb-4" />
        <slot />
      </div>
    </main>

    <!-- Notification drawer -->
    <AppNotificationDrawer />
  </UDashboardGroup>
</template>
