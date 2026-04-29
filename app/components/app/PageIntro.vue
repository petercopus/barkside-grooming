<script setup lang="ts">
defineProps<{
  kicker?: string;
  title: string;
  description?: string;
  backTo?: string;
  tagline?: string;
}>();
</script>

<template>
  <header class="relative">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0 max-w-2xl">
        <div
          v-if="backTo"
          class="reveal-subtle">
          <UButton
            variant="ghost"
            size="sm"
            icon="i-lucide-arrow-left"
            class="-ml-2 mb-2 text-muted hover:text-default"
            @click="navigateTo(backTo)">
            Back
          </UButton>
        </div>

        <p
          v-if="kicker"
          class="kicker reveal-subtle">
          {{ kicker }}
        </p>

        <h1
          class="font-display-soft text-barkside-900 leading-[1.05] mt-2 text-4xl sm:text-5xl reveal delay-1">
          {{ title }}
        </h1>

        <p
          v-if="description"
          class="text-base text-barkside-700 mt-3 leading-relaxed reveal-subtle delay-2">
          {{ description }}
        </p>

        <div
          v-if="tagline"
          class="flex items-center gap-3 mt-4 reveal-subtle delay-3">
          <span class="h-px w-10 bg-coral-500" />
          <span class="font-hand text-coral-600 text-lg">{{ tagline }}</span>
        </div>
      </div>

      <div
        v-if="$slots.actions"
        class="flex items-center gap-2 shrink-0 reveal-subtle delay-2">
        <slot name="actions" />
      </div>
    </div>

    <div
      v-if="$slots.meta"
      class="mt-6 reveal-subtle delay-3">
      <slot name="meta" />
    </div>
  </header>
</template>
