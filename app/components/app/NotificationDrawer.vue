<script setup lang="ts">
const { notifications, isOpen, unreadCount, markAsRead, markAllAsRead } = useNotifications();

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
</script>

<template>
  <USlideover
    v-model:open="isOpen"
    side="right"
    :close="true">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h3 class="text-lg font-semibold">Notifications</h3>
        <UButton
          v-if="unreadCount > 0"
          variant="ghost"
          size="sm"
          label="Mark all as read"
          @click="markAllAsRead()" />
      </div>
    </template>

    <template #body>
      <div
        v-if="notifications.length > 0"
        class="divide-y divide-default">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="p-4 transition-colors cursor-pointer hover:bg-muted/50"
          :class="{ 'bg-primary-50 dark:bg-primary-950/20': !notification.isRead }"
          @click="!notification.isRead && markAsRead(notification.id)">
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-medium">{{ notification.title }}</p>
            <span
              v-if="!notification.isRead"
              class="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          </div>
          <p class="text-sm text-muted mt-1">{{ notification.body }}</p>
          <p class="text-xs text-muted mt-2">{{ timeAgo(notification.createdAt) }}</p>
        </div>
      </div>

      <AppEmptyState
        v-else
        icon="i-lucide-bell-off"
        title="No notifications"
        description="You're all caught up."
        variant="section" />
    </template>
  </USlideover>
</template>
