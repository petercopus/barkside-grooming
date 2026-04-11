<script setup lang="ts">
import { NOTIFICATION_CATEGORIES } from '~~/shared/schemas/notification';
import type { NotificationCategory } from '~~/shared/schemas/notification';

definePageMeta({
  layout: 'customer',
  middleware: 'auth',
});

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

// Fetch existing preferences
const { data } = await useFetch<{ preferences: PreferenceRow[] }>('/api/notifications/preferences');

// Build local state with defaults for each category
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
  <div>
    <AppPageHeader
      title="Settings"
      description="Manage your notification preferences" />

    <div class="py-4">
      <AppSection title="Notification Preferences">
        <div class="divide-y divide-default">
          <div
            v-for="category in visibleCategories"
            :key="category"
            class="flex items-center justify-between py-4 gap-4">
            <p class="text-sm font-medium">{{ categoryLabels[category] }}</p>

            <div class="flex items-center gap-6">
              <label class="flex items-center gap-2 text-sm">
                <USwitch
                  v-model="getPreference(category).inappEnabled"
                  @update:model-value="save(getPreference(category))" />
                In-App
              </label>

              <label class="flex items-center gap-2 text-sm">
                <USwitch
                  v-model="getPreference(category).emailEnabled"
                  @update:model-value="save(getPreference(category))" />
                Email
              </label>

              <label class="flex items-center gap-2 text-sm">
                <USwitch
                  v-model="getPreference(category).smsEnabled"
                  @update:model-value="save(getPreference(category))" />
                SMS
              </label>
            </div>
          </div>
        </div>
      </AppSection>
    </div>
  </div>
</template>
