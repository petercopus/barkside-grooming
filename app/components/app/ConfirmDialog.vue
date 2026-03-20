<script lang="ts" setup>
interface ConfirmDialogProps {
  title?: string;
  description?: string;
  confirmLabel?: string;
  confirmColor?: 'error' | 'success' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral';
}

withDefaults(defineProps<ConfirmDialogProps>(), {
  title: 'Are you sure?',
  confirmLabel: 'Confirm',
  confirmColor: 'error',
});

const emits = defineEmits<{
  close: [value: boolean];
}>();
</script>

<template>
  <UModal
    :title="title"
    :description="description"
    :dismissible="false"
    :ui="{ footer: 'justify-end' }">
    <template #footer>
      <UButton
        label="Cancel"
        color="neutral"
        variant="outline"
        @click="emits('close', false)" />
      <UButton
        :label="confirmLabel"
        :color="confirmColor"
        @click="emits('close', true)" />
    </template>
  </UModal>
</template>
