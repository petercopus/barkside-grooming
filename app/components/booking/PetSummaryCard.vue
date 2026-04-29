<script setup lang="ts">
type LineItem = { name: string; priceCents: number };

defineProps<{
  petName: string;
  total: {
    baseItems: LineItem[];
    addonItems: LineItem[];
    discountCents: number;
    total: number;
  };
  slot?: { scheduledDate: string; startTime: string } | null;
  groomerName?: string;
  durationMinutes?: number;
}>();
</script>

<template>
  <div class="rounded-2xl border border-default/70 bg-white/70 p-5 shadow-sm">
    <header class="flex items-center gap-3 mb-4">
      <span
        class="inline-flex size-9 items-center justify-center rounded-xl bg-primary-100/70 text-primary-600 shrink-0">
        <UIcon
          name="i-lucide-paw-print"
          class="size-5" />
      </span>

      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 mb-0.5">
          Booking summary
        </p>

        <h4 class="text-base font-semibold text-default leading-tight">
          {{ petName || 'Your pup' }}
        </h4>
      </div>
    </header>

    <div
      v-if="slot"
      class="rounded-xl bg-primary-50/40 border border-primary-100/70 px-3 py-2.5 mb-4 space-y-1.5 text-sm">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-calendar"
          class="size-4 text-primary-500 shrink-0" />

        <span class="text-default">{{ formatDate(slot.scheduledDate, 'long') }}</span>
      </div>

      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-clock"
          class="size-4 text-primary-500 shrink-0" />

        <span class="text-default">{{ formatClockTime(slot.startTime) }}</span>

        <span
          v-if="durationMinutes"
          class="text-muted"
          >&middot; {{ durationMinutes }} min</span
        >
      </div>

      <div
        v-if="groomerName"
        class="flex items-center gap-2">
        <UIcon
          name="i-lucide-user"
          class="size-4 text-primary-500 shrink-0" />

        <span class="text-default">with {{ groomerName }}</span>
      </div>
    </div>

    <div class="space-y-3 text-sm">
      <div
        v-if="total.baseItems.length"
        class="space-y-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Services</p>

        <div
          v-for="item in total.baseItems"
          :key="`base-${item.name}`"
          class="flex justify-between">
          <span class="text-default">{{ item.name }}</span>
          <span class="text-default tabular-nums">${{ formatCents(item.priceCents) }}</span>
        </div>
      </div>

      <div
        v-if="total.addonItems.length"
        class="space-y-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Add-ons</p>

        <div
          v-for="item in total.addonItems"
          :key="`addon-${item.name}`"
          class="flex justify-between text-muted">
          <span>+ {{ item.name }}</span>
          <span class="tabular-nums">${{ formatCents(item.priceCents) }}</span>
        </div>
      </div>

      <div
        v-if="total.discountCents > 0"
        class="flex justify-between font-medium text-primary-600 pt-2 border-t border-default/70">
        <span class="inline-flex items-center gap-1">
          <UIcon
            name="i-lucide-sparkles"
            class="size-3.5" />
          Bundle discount
        </span>

        <span class="tabular-nums">-${{ formatCents(total.discountCents) }}</span>
      </div>

      <div class="flex justify-between text-base font-bold pt-2 border-t border-default">
        <span>Total</span>
        <span class="tabular-nums">${{ formatCents(total.total) }}</span>
      </div>
    </div>
  </div>
</template>
