<script setup lang="ts">
type ServiceLite = {
  id: number;
  name: string;
  isAddon?: boolean;
  pricing: { priceCents: number; durationMinutes: number };
};

type BundleLite = {
  id: number;
  name: string;
  description?: string | null;
  serviceIds: number[];
  discountType: string;
  discountValue: number;
};

const props = defineProps<{
  bundle: BundleLite;
  services: ServiceLite[];
  discountCents: number;
  selected: boolean;
  bestValue?: boolean;
}>();

const includedServices = computed(() =>
  props.bundle.serviceIds
    .map((id) => props.services.find((s) => s.id === id))
    .filter((s): s is ServiceLite => !!s),
);

const originalCents = computed(() =>
  includedServices.value.reduce((sum, s) => sum + s.pricing.priceCents, 0),
);

const discountedCents = computed(() => Math.max(0, originalCents.value - props.discountCents));

const totalDurationMinutes = computed(() =>
  includedServices.value.reduce((sum, s) => sum + s.pricing.durationMinutes, 0),
);

const discountLabel = computed(() =>
  props.bundle.discountType === 'percent'
    ? `${props.bundle.discountValue}% off`
    : `$${formatCents(props.bundle.discountValue)} off`,
);
</script>

<template>
  <button
    type="button"
    :class="[
      'group relative w-full text-left rounded-2xl border transition-all duration-200',
      'p-5 sm:p-6',
      selected
        ? 'border-primary-500 bg-primary-50/80 shadow-md ring-2 ring-primary-500'
        : 'border-primary-200/70 bg-linear-to-br from-primary-50/40 to-bone-50 hover:border-primary-400 hover:shadow-sm',
    ]">
    <div class="flex items-center gap-2 mb-3">
      <UBadge
        v-if="bestValue"
        color="primary"
        variant="solid"
        size="sm">
        <UIcon
          name="i-lucide-sparkles"
          class="size-3 mr-1" />

        Best value
      </UBadge>
      <span class="text-xs font-semibold uppercase tracking-wider text-primary-600">
        Bundle · {{ discountLabel }}
      </span>

      <span
        v-if="selected"
        class="ml-auto inline-flex items-center justify-center size-7 rounded-full bg-primary-500 text-white shadow">
        <UIcon
          name="i-lucide-check"
          class="size-4" />
      </span>
    </div>

    <!-- title + description -->
    <h5 class="text-lg font-semibold text-default leading-tight">{{ bundle.name }}</h5>
    <p
      v-if="bundle.description"
      class="text-sm text-muted mt-1">
      {{ bundle.description }}
    </p>

    <!-- pricing math -->
    <div class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="text-2xl font-bold text-default">${{ formatCents(discountedCents) }}</span>
      <span class="text-sm text-muted line-through">${{ formatCents(originalCents) }}</span>
      <span class="text-sm font-semibold text-primary-600">
        Save ${{ formatCents(discountCents) }}
      </span>
    </div>

    <!-- included services -->
    <div class="mt-4 flex flex-wrap gap-1.5">
      <span
        v-for="svc in includedServices"
        :key="svc.id"
        class="inline-flex items-center gap-1 rounded-full bg-white/70 border border-primary-200/70 px-2.5 py-1 text-xs text-default">
        <UIcon
          name="i-lucide-check"
          class="size-3 text-primary-500" />
        {{ svc.name }}
      </span>
    </div>

    <!-- Footer meta -->
    <div class="mt-4 flex items-center gap-4 text-xs text-muted">
      <span class="inline-flex items-center gap-1">
        <UIcon
          name="i-lucide-clock"
          class="size-3.5" />

        {{ totalDurationMinutes }} min total
      </span>

      <span class="inline-flex items-center gap-1">
        <UIcon
          name="i-lucide-layers"
          class="size-3.5" />

        {{ includedServices.length }} services
      </span>
    </div>
  </button>
</template>
