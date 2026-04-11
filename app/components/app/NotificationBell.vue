<script setup lang="ts">
const { unreadCount, toggle } = useNotifications();
</script>

<template>
  <div class="relative">
    <UButton
      icon="i-lucide-bell"
      variant="ghost"
      @click="toggle()" />
    <span
      v-if="unreadCount > 0"
      class="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </span>
  </div>
</template>
