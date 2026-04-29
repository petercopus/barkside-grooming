<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';

withDefaults(
  defineProps<{
    title: string;
    backTo: string;
    width?: 'content' | 'wide';
    formId: string;
    schema?: unknown;
    state: Record<string, unknown>;
    mode: 'create' | 'edit';
    loading?: boolean;
    isDirty?: boolean;
    createLabel?: string;
    saveLabel?: string;
  }>(),
  {
    width: 'wide',
    createLabel: 'Create',
    saveLabel: 'Save',
  },
);

const emit = defineEmits<{
  submit: [event: FormSubmitEvent<unknown>];
  discard: [];
}>();

const slots = useSlots();
const hasSidebar = computed(() => !!slots.sidebar);
</script>

<template>
  <AppPage
    :title="title"
    :back-to="backTo"
    :width="width">
    <template #actions>
      <slot name="extra-actions" />
      <UButton
        v-if="mode === 'create'"
        :to="backTo"
        variant="ghost"
        size="sm"
        label="Cancel" />
      <UButton
        v-else-if="isDirty"
        variant="ghost"
        size="sm"
        label="Discard"
        @click="emit('discard')" />
      <UButton
        type="submit"
        :form="formId"
        :loading="loading"
        :disabled="mode === 'edit' && !isDirty"
        size="sm"
        :label="mode === 'create' ? createLabel : saveLabel" />
    </template>

    <UForm
      :id="formId"
      :schema="schema"
      :state="state"
      @submit="(e) => emit('submit', e as FormSubmitEvent<unknown>)">
      <div
        v-if="hasSidebar"
        class="grid grid-cols-1 lg:grid-cols-[1fr_280px] items-start gap-6">
        <div class="space-y-6">
          <slot />
        </div>
        <div class="space-y-6">
          <slot name="sidebar" />
        </div>
      </div>
      <slot v-else />
    </UForm>
  </AppPage>
</template>
