export interface AppNotification {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  isRead: boolean;
  sentAt: string | null;
  createdAt: string;
}

export function useNotifications() {
  const { isLoggedIn } = useAuth();

  const notifications = useState<AppNotification[]>('notifications', () => []);
  const unreadCount = useState<number>('notification-unread-count', () => 0);
  const isOpen = useState<boolean>('notification-drawer-open', () => false);

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  async function fetchNotifications() {
    try {
      const data = await $fetch<{ notifications: AppNotification[] }>('/api/notifications');
      notifications.value = data.notifications;
    } catch {}
  }

  async function fetchUnreadCount() {
    if (!isLoggedIn.value) return;

    try {
      const data = await $fetch<{ count: number }>('/api/notifications/unread-count');
      unreadCount.value = data.count;
    } catch {}
  }

  async function markAsRead(id: string) {
    await $fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });

    // optimistic local update
    const notification = notifications.value.find((n) => n.id === id);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function markAllAsRead() {
    await $fetch('/api/notifications/read-all', { method: 'PATCH' });

    // optimistic local update
    notifications.value.forEach((n) => (n.isRead = true));
    unreadCount.value = 0;
  }

  function open() {
    isOpen.value = true;
    fetchNotifications();
  }

  function close() {
    isOpen.value = false;
  }

  function toggle() {
    if (isOpen.value) {
      close();
    } else {
      open();
    }
  }

  function startPolling() {
    if (pollInterval) return;

    fetchUnreadCount();
    pollInterval = setInterval(fetchUnreadCount, 30_000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  if (import.meta.client) {
    watch(
      isLoggedIn,
      (loggedIn) => {
        if (loggedIn) {
          startPolling();
        } else {
          stopPolling();
          notifications.value = [];
          unreadCount.value = 0;
        }
      },
      { immediate: true },
    );

    onScopeDispose(stopPolling);
  }

  return {
    notifications,
    unreadCount,
    isOpen,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    open,
    close,
    toggle,
  };
}
