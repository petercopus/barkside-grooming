<script setup lang="ts">
const props = withDefaults(
  defineProps<{ phoneNumber: string | null | undefined; loud?: boolean }>(),
  { loud: false },
);

const classes = computed(() => {
  const base = [
    'text-primary font-medium decoration-primary/30 underline-offset-4 hover:underline hover:decoration-primary',
  ];

  if (props.loud) base.push('underline');

  return base;
});
</script>

<template>
  <NuxtLink
    v-if="props.phoneNumber"
    :to="`tel:${props.phoneNumber}`"
    :class="classes"
    @click.stop>
    {{ formatPhone(props.phoneNumber) }}
  </NuxtLink>
  <span
    v-else
    class="text-dimmed">
    —
  </span>
</template>
