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
}>();
</script>

<template>
  <div>
    <h4 class="font-semibold mb-3">{{ petName }}</h4>

    <AppCard>
      <div>
        <p class="font-medium mb-1">Services</p>
        <div
          v-for="item in total.baseItems"
          :key="item.name"
          class="flex justify-between">
          <span>{{ item.name }}</span>
          <span>${{ formatCents(item.priceCents) }}</span>
        </div>
      </div>

      <div v-if="total.addonItems.length">
        <p class="font-medium mb-1">Add-ons</p>
        <div
          v-for="item in total.addonItems"
          :key="item.name"
          class="flex justify-between">
          <span>{{ item.name }}</span>
          <span>${{ formatCents(item.priceCents) }}</span>
        </div>
      </div>

      <div
        v-if="total.discountCents > 0"
        class="flex justify-between text-success">
        <span>Bundle discount</span>
        <span>-${{ formatCents(total.discountCents) }}</span>
      </div>

      <hr class="border-default" />

      <div
        v-if="slot"
        class="flex justify-between">
        <span>{{ slot.scheduledDate }} at {{ slot.startTime }}</span>
      </div>

      <div class="flex justify-between font-semibold text-base">
        <span>Total</span>
        <span>${{ formatCents(total.total) }}</span>
      </div>
    </AppCard>
  </div>
</template>
