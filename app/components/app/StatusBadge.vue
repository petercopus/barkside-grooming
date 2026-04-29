<script setup lang="ts">
import {
  apptStatusColor,
  apptStatusLabel,
  invoiceStatusColor,
  invoiceStatusLabel,
} from '~/utils/appointment';
import {
  docReqStatusColor,
  docReqStatusLabel,
  docStatusColor,
  docStatusLabel,
} from '~/utils/document';

type BadgeColor = 'success' | 'error' | 'primary' | 'warning' | 'info' | 'neutral';
type BadgeVariant = 'subtle' | 'solid' | 'soft' | 'outline';

type Kind = 'appointment' | 'document' | 'document-request' | 'invoice' | 'active';

const props = withDefaults(
  defineProps<{
    kind: Kind;
    value: string | boolean | null | undefined;
    variant?: BadgeVariant;
  }>(),
  { variant: 'subtle' },
);

const COLOR_MAPS = {
  'appointment': apptStatusColor,
  'document': docStatusColor,
  'document-request': docReqStatusColor,
  'invoice': invoiceStatusColor,
} as Record<Exclude<Kind, 'active'>, Record<string, BadgeColor>>;

const LABEL_MAPS = {
  'appointment': apptStatusLabel,
  'document': docStatusLabel,
  'document-request': docReqStatusLabel,
  'invoice': invoiceStatusLabel,
} as Record<Exclude<Kind, 'active'>, Record<string, string>>;

const resolvedColor = computed<BadgeColor>(() => {
  if (props.kind === 'active') {
    return props.value ? 'success' : 'neutral';
  }
  const key = String(props.value ?? '');
  return COLOR_MAPS[props.kind][key] ?? 'neutral';
});

const resolvedLabel = computed(() => {
  if (props.kind === 'active') {
    return props.value ? 'Active' : 'Inactive';
  }
  const key = String(props.value ?? '');
  return LABEL_MAPS[props.kind][key] ?? key;
});
</script>

<template>
  <UBadge
    :color="resolvedColor"
    :variant="variant">
    {{ resolvedLabel }}
  </UBadge>
</template>
