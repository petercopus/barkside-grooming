<script setup lang="ts">
const { unreadCount, toggle } = useNotifications();

const hasUnread = computed(() => unreadCount.value > 0);
</script>

<template>
  <button
    type="button"
    class="relative inline-flex size-10 items-center justify-center rounded-full transition-colors hover:bg-bone-200/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
    :aria-label="hasUnread ? `${unreadCount} unread notifications` : 'Notifications'"
    @click="toggle()">
    <UIcon
      :name="hasUnread ? 'i-lucide-bell-ring' : 'i-lucide-bell'"
      class="size-5 text-barkside-800 transition-transform"
      :class="hasUnread ? 'animate-bell-tilt' : ''" />

    <!-- Unread badge -->
    <span
      v-if="hasUnread"
      class="absolute -top-0.5 -right-0.5 inline-flex min-w-[1.1rem] h-[1.1rem] items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-bone-50 tabular-nums">
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </span>

    <!-- Pulse ring -->
    <span
      v-if="hasUnread"
      class="absolute -top-0.5 -right-0.5 size-[1.1rem] rounded-full bg-coral-500/40 animate-ping" />
  </button>
</template>

<style scoped>
@keyframes bell-tilt {
  0%,
  60%,
  100% {
    transform: rotate(0deg);
  }
  10% {
    transform: rotate(-12deg);
  }
  20% {
    transform: rotate(10deg);
  }
  30% {
    transform: rotate(-8deg);
  }
  40% {
    transform: rotate(6deg);
  }
  50% {
    transform: rotate(-3deg);
  }
}
.animate-bell-tilt {
  animation: bell-tilt 2.4s ease-in-out infinite;
  transform-origin: top center;
}
</style>
