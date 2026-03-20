<!-- Authenticated layout (customer dashboard, employee, admin, etc) -->
<script setup lang="ts">
const { user, logout } = useAuth();
const { hasPerm } = usePermissions();

// Sidebar nav items
// built based on perms
// TODO: finalize actual permission and pages
const navItems = computed(() => {
  // Customer
  const items = [
    { label: 'Home', icon: 'i-lucide-house', to: '/me/home' },
    { label: 'My Pets', icon: 'i-lucide-dog', to: '/me/pets' },
    { label: 'Appointments', icon: 'i-lucide-calendar', to: '/me/appointments' },
  ];

  // Employee only
  if (hasPerm('service:read')) {
    items.push({ label: 'Services', icon: 'i-lucide-scissors', to: '/employee/services' });
  }

  if (hasPerm('employee:read')) {
    items.push({ label: 'Employees', icon: 'i-lucide-users', to: '/employee/employees' });
  }

  if (hasPerm('schedule:read:own')) {
    items.push({ label: 'My schedule', icon: 'i-lucide-clock', to: '/employee/me/schedule' });
  }

  if (hasPerm('booking:read:all')) {
    items.push({ label: 'Check-In', icon: 'i-lucide-clipboard-check', to: '/employee/check-in' });
  }

  if (hasPerm('settings:manage')) {
    items.push({ label: 'Settings', icon: 'i-lucide-settings', to: '/employee/settings' });
  }

  return items;
});
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <UDashboardSidebar>
      <template #header>
        <span class="text-lg font-bold">Barkside</span>
      </template>

      <!-- Nav -->
      <UNavigationMenu
        :items="navItems"
        orientation="vertical"
        class="w-full" />

      <!-- User info
       TODO: menu to manage self. Likely UDropdownMenu w/ UAvatar? -->
      <template #footer>
        <div class="flex items-center justify-between w-full">
          <span class="text-sm text-muted"> {{ user?.firstName }} {{ user?.lastName }} </span>
          <UButton
            icon="i-lucide-log-out"
            variant="ghost"
            size="sm"
            @click="logout" />
        </div>
      </template>
    </UDashboardSidebar>

    <!-- Main content -->
    <div class="flex-1 flex flex-col">
      <!-- <UDashboardNavbar title="Barkside Grooming" /> -->

      <main class="w-full max-w-6xl mx-auto flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
