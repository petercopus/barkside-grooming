<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  kicker?: string;
  icon?: string;
}>();
</script>

<template>
  <section class="rounded-2xl border border-default/70 bg-white/40 p-5 sm:p-6">
    <header class="mb-4 flex items-start gap-3">
      <span
        v-if="icon"
        class="inline-flex size-9 items-center justify-center rounded-xl bg-primary-100/70 text-primary-600 shrink-0">
        <UIcon
          :name="icon"
          class="size-5" />
      </span>

      <div class="min-w-0 flex-1">
        <p
          v-if="kicker"
          class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 mb-0.5">
          {{ kicker }}
        </p>

        <h4 class="text-lg font-semibold text-default leading-tight">{{ title }}</h4>

        <p
          v-if="description"
          class="text-sm text-muted mt-0.5">
          {{ description }}
        </p>
      </div>

      <div
        v-if="$slots.actions"
        class="shrink-0">
        <slot name="actions" />
      </div>
    </header>

    <slot />
  </section>
</template>
