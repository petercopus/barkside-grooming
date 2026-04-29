<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string | null | undefined;
    loud?: boolean;
  }>(),
  { loud: false },
);

const classes = computed(() => {
  const base = ['text-primary font-medium'];

  if (props.id)
    base.push('decoration-primary/30 underline-offset-4 hover:underline hover:decoration-primary');
  if (props.loud) base.push('underline');

  return base;
});
</script>

<template>
  <NuxtLink
    v-if="props.id"
    :to="`/admin/appointments/${props.id}`"
    :class="classes"
    @click.stop>
    <slot />
  </NuxtLink>
  <span
    v-else
    :class="classes">
    <slot />
  </span>
</template>
