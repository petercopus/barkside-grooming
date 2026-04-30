<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number | null | undefined;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    disabled?: boolean;
    allowNegative?: boolean;
  }>(),
  {
    min: 0,
    step: 0.01,
    placeholder: undefined,
    max: undefined,
    disabled: false,
    allowNegative: false,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: number | null];
}>();

const dollars = computed({
  get: () => (props.modelValue == null ? undefined : props.modelValue / 100),
  set: (v) => {
    if (v == null || Number.isNaN(v)) {
      emit('update:modelValue', null);
      return;
    }

    emit('update:modelValue', Math.round(v * 100));
  },
});

const effectiveMin = computed(() => (props.allowNegative ? undefined : props.min));
</script>

<template>
  <UInputNumber
    v-model="dollars"
    :min="effectiveMin"
    :max="max"
    :step="step"
    :step-snapping="false"
    :placeholder="placeholder"
    :disabled="disabled"
    :format-options="{ style: 'currency', currency: 'USD' }" />
</template>
