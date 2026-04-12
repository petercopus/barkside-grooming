<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

definePageMeta({
  layout: 'customer',
  middleware: 'auth',
});

const route = useRoute();
const router = useRouter();

const items: (TabsItem & { path: string })[] = [
  {
    label: 'Notifications',
    icon: 'i-lucide-bell',
    value: 'notifications',
    path: '/me/settings/notifications',
  },
  {
    label: 'Payment Methods',
    icon: 'i-lucide-credit-card',
    value: 'payment-methods',
    path: '/me/settings/payment-methods',
  },
];

const activeTab = computed({
  get() {
    const match = items.find((item) => route.path.startsWith(item.path));
    return match?.value ?? items[0]?.value;
  },
  set(value: string) {
    const tab = items.find((item) => item.value === value);
    if (tab) router.push(tab.path);
  },
});
</script>

<template>
  <div>
    <AppPageHeader
      title="Settings"
      description="Manage your preferences and payment methods" />

    <UTabs
      v-model="activeTab"
      :items="items"
      :content="false"
      class="mb-6" />

    <NuxtPage />
  </div>
</template>
