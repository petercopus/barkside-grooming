<script setup lang="ts">
import type { ServiceWithPricing } from '~~/shared/types/service';

defineProps<{
  addons: ServiceWithPricing[];
}>();

const selected = defineModel<number[]>('selected', { default: () => [] });

function toggle(id: number) {
  const idx = selected.value.indexOf(id);
  if (idx === -1) selected.value = [...selected.value, id];
  else selected.value = selected.value.filter((s) => s !== id);
}
</script>

<template>
  <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <li
      v-for="addon in addons"
      :key="addon.id">
      <button
        type="button"
        :class="[
          'group w-full text-left flex items-center gap-3 rounded-xl border px-3 py-2.5 transition',
          selected.includes(addon.id)
            ? 'border-primary-500 bg-primary-50/70'
            : 'border-default bg-white/60 hover:border-primary-300',
        ]"
        @click="toggle(addon.id)">
        <span
          :class="[
            'inline-flex items-center justify-center size-8 rounded-lg transition shrink-0',
            selected.includes(addon.id)
              ? 'bg-primary-500 text-white'
              : 'bg-primary-100/60 text-primary-600 group-hover:bg-primary-100',
          ]">
          <UIcon
            :name="selected.includes(addon.id) ? 'i-lucide-check' : 'i-lucide-plus'"
            class="size-4" />
        </span>

        <span class="flex-1 min-w-0">
          <span class="block text-sm font-medium text-default truncate">{{ addon.name }}</span>
          <span class="block text-xs text-muted truncate">
            {{ addon.pricing.durationMinutes }} min
            <span
              v-if="addon.description"
              class="ml-1">
              · {{ addon.description }}
            </span>
          </span>
        </span>

        <span class="text-sm font-semibold text-default shrink-0">
          +${{ formatCents(addon.pricing.priceCents) }}
        </span>
      </button>
    </li>
  </ul>
</template>
