<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    kicker?: string;
    icon?: string;
    tone?: 'default' | 'plain' | 'flush';
    error?: string | null;
  }>(),
  { tone: 'default' },
);
</script>

<template>
  <section
    :class="[
      'rounded-2xl border border-default/70',
      tone === 'plain' ? 'bg-white/40' : 'bg-white/60',
      tone === 'flush' ? 'p-0' : 'p-5 sm:p-6',
    ]">
    <header
      v-if="title || $slots.actions || kicker"
      :class="[
        'flex items-start gap-3',
        tone === 'flush' ? 'px-5 sm:px-6 pt-5 sm:pt-6' : '',
        $slots.default ? 'mb-4' : '',
      ]">
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

        <h4
          v-if="title"
          class="text-lg font-semibold text-default leading-tight">
          {{ title }}
        </h4>

        <p
          v-if="description"
          class="text-sm text-muted mt-0.5">
          {{ description }}
        </p>
      </div>

      <div
        v-if="$slots.actions"
        class="shrink-0 flex items-center gap-2">
        <slot name="actions" />
      </div>
    </header>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
      class="mb-4" />

    <slot />
  </section>
</template>
