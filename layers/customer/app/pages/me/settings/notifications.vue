<script setup lang="ts">
import type { NotificationCategory } from '~~/shared/schemas/notification';
import { NOTIFICATION_CATEGORIES } from '~~/shared/schemas/notification';

definePageMeta({
  layout: 'site',
  middleware: 'auth',
});

const { hasPerm } = usePermissions();
const toast = useToast();

const categoryDescriptions: Record<NotificationCategory, { label: string; hint: string }> = {
  appointment_confirmed: {
    label: 'Booking confirmed',
    hint: 'When a new appointment lands on the calendar.',
  },
  appointment_reminder: {
    label: 'Appointment reminders',
    hint: "A friendly nudge ahead of your pup's visit.",
  },
  appointment_cancelled: {
    label: 'Booking cancelled',
    hint: 'If a visit is cancelled — by you or by us.',
  },
  appointment_status_changed: {
    label: 'Status updates',
    hint: 'Pickups, drop-offs, and check-ins along the way.',
  },
  admin_new_booking: {
    label: 'New booking (admin)',
    hint: 'Internal alerts when a customer books.',
  },
  payment_refunded: {
    label: 'Refunds',
    hint: 'When we issue a refund on a paid appointment.',
  },
  document_request: {
    label: 'Document requests',
    hint: 'When we ask you for a vaccination record or similar.',
  },
};

interface PreferenceRow {
  category: NotificationCategory;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inappEnabled: boolean;
}

const { data } = await useFetch<{ preferences: PreferenceRow[] }>('/api/notifications/preferences');

const visibleCategories = computed(() =>
  NOTIFICATION_CATEGORIES.filter(
    (cat) => cat !== 'admin_new_booking' || hasPerm('booking:read:all'),
  ),
);

const preferences = ref<PreferenceRow[]>(
  NOTIFICATION_CATEGORIES.map((category) => {
    const existing = data.value?.preferences.find((p) => p.category === category);

    return {
      category,
      emailEnabled: existing?.emailEnabled ?? true,
      smsEnabled: existing?.smsEnabled ?? false,
      inappEnabled: existing?.inappEnabled ?? true,
    };
  }),
);

function getPreference(category: NotificationCategory): PreferenceRow {
  return preferences.value.find((p) => p.category === category)!;
}

async function save(pref: PreferenceRow) {
  try {
    await $fetch('/api/notifications/preferences', {
      method: 'PUT',
      body: {
        category: pref.category,
        emailEnabled: pref.emailEnabled,
        smsEnabled: pref.smsEnabled,
        inappEnabled: pref.inappEnabled,
      },
    });
  } catch {
    toast.add({ title: 'Failed to save preference', color: 'error' });
  }
}

const channels = [
  { key: 'inappEnabled', label: 'In-app', icon: 'i-lucide-bell' },
  { key: 'emailEnabled', label: 'Email', icon: 'i-lucide-mail' },
  { key: 'smsEnabled', label: 'SMS', icon: 'i-lucide-message-circle' },
] as const;
</script>

<template>
  <AppSectionPanel
    kicker="Notifications"
    title="How should we reach you?"
    description="Toggle channels per type — changes save automatically."
    icon="i-lucide-bell">
    <!-- Column headers -->
    <div
      class="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-x-8 items-center pb-3 mb-2 border-b border-default/60">
      <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        Notification
      </span>

      <span
        v-for="ch in channels"
        :key="ch.key"
        class="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted text-center min-w-15 inline-flex flex-col items-center gap-1">
        <UIcon
          :name="ch.icon"
          class="size-3.5 text-primary-500" />
        {{ ch.label }}
      </span>
    </div>

    <div class="divide-y divide-default/60">
      <div
        v-for="category in visibleCategories"
        :key="category"
        class="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto] sm:gap-x-8 gap-y-3 items-center py-4">
        <div class="min-w-0">
          <p class="font-medium text-default">{{ categoryDescriptions[category].label }}</p>
          <p class="text-sm text-muted mt-0.5">{{ categoryDescriptions[category].hint }}</p>
        </div>

        <!-- Mobile -->
        <div class="sm:hidden col-span-2 flex flex-wrap gap-x-5 gap-y-2 -mt-1">
          <USwitch
            v-for="ch in channels"
            :key="ch.key"
            v-model="getPreference(category)[ch.key]"
            :label="ch.label"
            @update:model-value="save(getPreference(category))" />
        </div>

        <!-- Desktop -->
        <div
          v-for="ch in channels"
          :key="ch.key"
          class="hidden sm:flex justify-center">
          <USwitch
            v-model="getPreference(category)[ch.key]"
            @update:model-value="save(getPreference(category))" />
        </div>
      </div>
    </div>
  </AppSectionPanel>
</template>
