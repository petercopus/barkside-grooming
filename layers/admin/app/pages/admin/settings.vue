<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

definePageMeta({
  layout: 'dashboard',
});

const route = useRoute();
const router = useRouter();
const { hasPerm } = usePermissions();

const items = computed(() => {
  const tabs: (TabsItem & { path: string })[] = [];

  if (hasPerm('service:read'))
    tabs.push({
      label: 'Services',
      icon: 'i-lucide-scissors',
      value: 'services',
      path: '/admin/settings/services',
    });
  if (hasPerm('size-category:manage'))
    tabs.push({
      label: 'Size Categories',
      icon: 'i-lucide-ruler',
      value: 'size-categories',
      path: '/admin/settings/size-categories',
    });
  if (hasPerm('employee:read'))
    tabs.push({
      label: 'Employees',
      icon: 'i-lucide-users',
      value: 'employees',
      path: '/admin/settings/employees',
    });
  if (hasPerm('role:manage'))
    tabs.push({
      label: 'Roles',
      icon: 'i-lucide-shield',
      value: 'roles',
      path: '/admin/settings/roles',
    });

  return tabs;
});

const activeTab = computed({
  get() {
    const match = items.value.find((item) => route.path.startsWith(item.path));
    return match?.value ?? items.value[0]?.value;
  },
  set(value: string) {
    const tab = items.value.find((item) => item.value === value);
    if (tab) router.push(tab.path);
  },
});
</script>

<template>
  <div>
    <UTabs
      v-model="activeTab"
      :items="items"
      :content="false"
      class="mb-6" />

    <NuxtPage />
  </div>
</template>
