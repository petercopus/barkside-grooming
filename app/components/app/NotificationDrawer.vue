<script setup lang="ts">
import type { AppNotification } from '~/composables/useNotifications';

const { notifications, isOpen, unreadCount, markAsRead, markAllAsRead } = useNotifications();

/* ────────────────────────────────────────── *
 * Time formatting
 * ────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function bucketOf(dateStr: string): 'today' | 'yesterday' | 'week' | 'earlier' {
  const now = new Date();
  const then = new Date(dateStr);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 6 * 86_400_000;
  const t = then.getTime();
  if (t >= startOfToday) return 'today';
  if (t >= startOfYesterday) return 'yesterday';
  if (t >= startOfWeek) return 'week';
  return 'earlier';
}

const bucketLabels: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Earlier this week',
  earlier: 'A while back',
};

/* ────────────────────────────────────────── *
 * Categories
 * ────────────────────────────────────────── */
type Tone = 'primary' | 'success' | 'coral' | 'bone';
type CategoryStyle = { icon: string; tone: Tone; label: string };

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  appointment_confirmed: {
    icon: 'i-lucide-calendar-check-2',
    tone: 'success',
    label: 'Confirmed',
  },
  appointment_reminder: {
    icon: 'i-lucide-bell-ring',
    tone: 'primary',
    label: 'Reminder',
  },
  appointment_cancelled: {
    icon: 'i-lucide-calendar-x-2',
    tone: 'coral',
    label: 'Cancelled',
  },
  appointment_status_changed: {
    icon: 'i-lucide-refresh-cw',
    tone: 'primary',
    label: 'Status update',
  },
  appointment_released: {
    icon: 'i-lucide-shield-alert',
    tone: 'coral',
    label: 'Action needed',
  },
  pending_documents: {
    icon: 'i-lucide-file-warning',
    tone: 'coral',
    label: 'Action needed',
  },
  admin_new_booking: {
    icon: 'i-lucide-sparkles',
    tone: 'primary',
    label: 'New booking',
  },
  payment_refunded: {
    icon: 'i-lucide-undo-2',
    tone: 'success',
    label: 'Refund',
  },
};

function styleFor(notif: AppNotification): CategoryStyle {
  const byCategory = CATEGORY_STYLES[notif.category];
  if (byCategory) return byCategory;

  const byType = CATEGORY_STYLES[notif.type];
  if (byType) return byType;

  const t = (notif.title ?? '').toLowerCase();
  if (t.includes('release') || t.includes('action')) return CATEGORY_STYLES.appointment_released!;
  if (t.includes('cancel')) return CATEGORY_STYLES.appointment_cancelled!;
  if (t.includes('confirm')) return CATEGORY_STYLES.appointment_confirmed!;
  if (t.includes('remind')) return CATEGORY_STYLES.appointment_reminder!;

  return { icon: 'i-lucide-bell', tone: 'primary', label: 'Update' };
}

const TONE_PILL: Record<Tone, string> = {
  primary: 'bg-primary-100/70 text-primary-700',
  success: 'bg-moss-100 text-moss-700',
  coral: 'bg-coral-100 text-coral-700',
  bone: 'bg-bone-200/70 text-bone-700',
};

const TONE_DOT: Record<Tone, string> = {
  primary: 'bg-primary-500',
  success: 'bg-moss-500',
  coral: 'bg-coral-500',
  bone: 'bg-bone-500',
};

/* ────────────────────────────────────────── *
 * Grouping
 * ────────────────────────────────────────── */
const grouped = computed(() => {
  const buckets: Record<string, AppNotification[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };

  for (const n of notifications.value) {
    buckets[bucketOf(n.createdAt)]!.push(n);
  }

  return (Object.entries(buckets) as [keyof typeof buckets, AppNotification[]][])
    .filter(([, items]) => items.length > 0)
    .map(([key, items]) => ({ key, label: bucketLabels[key]!, items }));
});
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :close="false"
    :ui="{
      content: 'bg-bone-50 border-l border-default/70 shadow-2xl',
      header: 'p-0 border-b-0',
      body: 'p-0',
      footer: 'p-0 border-t-0',
    }">
    <template #header>
      <div class="relative w-full">
        <!-- left border -->
        <div
          class="absolute inset-x-0 -bottom-2 h-2 bg-linear-to-b from-default/40 to-transparent" />

        <div class="px-6 pt-6 pb-5">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="kicker">Inbox</p>
              <h3 class="font-display-soft text-3xl text-barkside-900 leading-tight mt-1.5">
                Notifications
              </h3>
            </div>
            <UButton
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              aria-label="Close"
              @click="isOpen = false" />
          </div>

          <div class="mt-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="
                  unreadCount > 0 ? 'bg-coral-100 text-coral-700' : 'bg-bone-200/60 text-bone-700'
                ">
                <span
                  v-if="unreadCount > 0"
                  class="size-1.5 rounded-full bg-coral-500 animate-pulse" />

                <UIcon
                  v-else
                  name="i-lucide-check"
                  class="size-3" />

                {{ unreadCount > 0 ? `${unreadCount} unread` : 'All caught up' }}
              </span>
            </div>

            <UButton
              v-if="unreadCount > 0"
              variant="ghost"
              size="xs"
              icon="i-lucide-check-check"
              label="Mark all read"
              @click="markAllAsRead()" />
          </div>
        </div>
      </div>
    </template>

    <template #body>
      <div
        v-if="notifications.length > 0"
        class="px-4 pb-6">
        <section
          v-for="(group, gIdx) in grouped"
          :key="group.key"
          class="mb-6 last:mb-0">
          <p
            class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted px-2 mt-3 mb-2"
            :class="gIdx === 0 ? 'mt-1' : ''">
            {{ group.label }}
          </p>

          <ul class="space-y-2">
            <li
              v-for="(notif, idx) in group.items"
              :key="notif.id"
              :style="{ animationDelay: `${Math.min(idx * 40, 200)}ms` }"
              class="reveal-subtle">
              <button
                type="button"
                class="group relative w-full text-left rounded-2xl border px-4 py-3.5 transition-all duration-200 cursor-pointer"
                :class="
                  notif.isRead
                    ? 'border-default/50 bg-transparent hover:bg-white/60 hover:border-default/70'
                    : 'border-default/70 bg-white/80 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                "
                @click="!notif.isRead && markAsRead(notif.id)">
                <!-- left border -->
                <span
                  v-if="!notif.isRead"
                  aria-hidden="true"
                  class="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                  <span
                    class="absolute inset-y-0 left-0 w-1"
                    :class="TONE_DOT[styleFor(notif).tone]" />
                </span>

                <div class="flex items-start gap-3">
                  <span
                    class="inline-flex size-9 items-center justify-center rounded-xl shrink-0 shadow-sm"
                    :class="[TONE_PILL[styleFor(notif).tone], notif.isRead ? 'opacity-70' : '']">
                    <UIcon
                      :name="styleFor(notif).icon"
                      class="size-4" />
                  </span>

                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-2">
                      <p
                        class="text-sm leading-snug truncate"
                        :class="
                          notif.isRead ? 'text-muted font-medium' : 'text-default font-semibold'
                        ">
                        {{ notif.title }}
                      </p>

                      <span
                        v-if="!notif.isRead"
                        class="mt-1.5 size-2 shrink-0 rounded-full bg-coral-500"
                        aria-label="Unread" />
                    </div>

                    <p
                      class="text-sm mt-0.5 line-clamp-2 leading-relaxed"
                      :class="notif.isRead ? 'text-dimmed' : 'text-toned'">
                      {{ notif.body }}
                    </p>

                    <div class="mt-2 flex items-center gap-2 text-[11px]">
                      <span
                        class="font-semibold uppercase tracking-[0.14em]"
                        :class="notif.isRead ? 'text-dimmed' : 'text-primary-600'">
                        {{ styleFor(notif).label }}
                      </span>

                      <span class="text-bone-400">·</span>

                      <span
                        class="inline-flex items-center gap-1 tabular-nums"
                        :class="notif.isRead ? 'text-dimmed' : 'text-muted'">
                        <UIcon
                          name="i-lucide-clock"
                          class="size-3" />
                        {{ timeAgo(notif.createdAt) }}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          </ul>
        </section>
      </div>

      <div
        v-else
        class="px-6 py-10">
        <AppEmptyState
          icon="i-lucide-bell-off"
          title="All caught up"
          description="No new notifications. We'll let you know when there's something to share."
          variant="section" />
      </div>
    </template>

    <template #footer>
      <NuxtLink
        to="/me/settings/notifications"
        class="flex items-center justify-between gap-2 w-full px-6 py-4 border-t border-default/60 bg-bone-100/40 text-sm text-muted hover:text-default hover:bg-bone-100/70 transition-colors group"
        @click="isOpen = false">
        <span class="inline-flex items-center gap-2">
          <UIcon
            name="i-lucide-settings-2"
            class="size-4 text-primary-500" />
          Notification settings
        </span>

        <UIcon
          name="i-lucide-arrow-right"
          class="size-4 transition-transform group-hover:translate-x-0.5" />
      </NuxtLink>
    </template>
  </USlideover>
</template>
