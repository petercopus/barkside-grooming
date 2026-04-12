<script setup lang="ts">
import { NOTIFICATION_CATEGORIES } from '~~/shared/schemas/notification';
import type { NotificationCategory } from '~~/shared/schemas/notification';

const { hasPerm } = usePermissions();
const toast = useToast();

const categoryLabels: Record<NotificationCategory, string> = {
  appointment_confirmed: 'Booking Confirmed',
  appointment_reminder: 'Appointment Reminders',
  appointment_cancelled: 'Booking Cancelled',
  appointment_status_changed: 'Status Updates',
  admin_new_booking: 'New Booking (Admin)',
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
</script>

<template>
  <div class="py-4">
    <AppSection title="Notification Preferences">
      <div class="divide-y divide-default">
        <div
          v-for="category in visibleCategories"
          :key="category"
          class="flex items-center justify-between py-4 gap-4">
          <p class="text-sm font-medium">{{ categoryLabels[category] }}</p>

          <div class="flex items-center gap-6">
            <USwitch
              v-model="getPreference(category).inappEnabled"
              label="In-App"
              @update:model-value="save(getPreference(category))" />

            <USwitch
              v-model="getPreference(category).emailEnabled"
              label="Email"
              @update:model-value="save(getPreference(category))" />

            <USwitch
              v-model="getPreference(category).smsEnabled"
              label="SMS"
              @update:model-value="save(getPreference(category))" />
          </div>
        </div>
      </div>
    </AppSection>
  </div>
</template>
