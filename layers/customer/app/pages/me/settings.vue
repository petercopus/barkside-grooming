<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const route = useRoute();
const router = useRouter();

const items: (TabsItem & { path: string })[] = [
  {
    label: 'Profile',
    icon: 'i-lucide-user-round',
    value: 'profile',
    path: '/me/settings/profile',
  },
  {
    label: 'Notifications',
    icon: 'i-lucide-bell',
    value: 'notifications',
    path: '/me/settings/notifications',
  },
  {
    label: 'Payment methods',
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
  <div class="cms-container py-10 sm:py-14">
    <AppPageIntro
      kicker="Your account"
      title="Settings" />

    <nav class="mt-8 -mx-4 px-4 overflow-x-auto">
      <div class="flex gap-2 border-b border-default/70">
        <NuxtLink
          v-for="item in items"
          :key="item.value"
          :to="item.path"
          class="group inline-flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 transition whitespace-nowrap"
          :class="
            activeTab === item.value
              ? 'border-primary-500 text-default font-semibold'
              : 'border-transparent text-muted hover:text-default'
          ">
          <UIcon
            :name="item.icon!"
            class="size-4"
            :class="
              activeTab === item.value ? 'text-primary-500' : 'text-muted group-hover:text-default'
            " />
          {{ item.label }}
        </NuxtLink>
      </div>
    </nav>

    <div class="mt-8">
      <NuxtPage />
    </div>
  </div>
</template>
