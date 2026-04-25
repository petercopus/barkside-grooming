<script setup lang="ts">
interface Props {
  variant?: 'light' | 'dark' | 'outline';
  icon?: string;
}
withDefaults(defineProps<Props>(), {
  variant: 'light',
  icon: 'i-lucide-arrow-right',
});
</script>

<template>
  <span
    class="flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45"
    :class="{
      'bg-bone-50 text-barkside-900': variant === 'light',
      'bg-barkside-900 text-bone-50': variant === 'dark',
      'border border-current/20': variant === 'outline',
    }">
    <UIcon
      :name="icon"
      class="h-4 w-4" />
  </span>
</template>
