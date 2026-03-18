<script setup lang="ts">
import {
  updateServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from '~~/shared/schemas/service';

definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});

const route = useRoute();
const serviceId = Number(route.params.id);

// Do our fetches in parallel
const { data: serviceData } = await useFetch(`/api/services/${serviceId}`);
const { data: categoryData } = await useFetch(`/api/size-categories`);

if (!serviceData.value?.service) {
  throw createError({ statusCode: 404, message: 'Service not found' });
}

const service = serviceData.value.service;
const categories = computed(() => categoryData.value?.categories ?? []);

//#region Service Details
const detailsError = ref<string | null>(null);
const detailsLoading = ref(false);

async function onDetailsSubmit(data: CreateServiceInput | UpdateServiceInput) {
  detailsError.value = null;
  detailsLoading.value = true;

  try {
    await $fetch(`/api/services/${serviceId}`, { method: 'PATCH', body: data });
    await navigateTo('/employee/services');
  } catch (e: any) {
    detailsError.value = e.data?.message || 'Failed to update service';
  } finally {
    detailsLoading.value = false;
  }
}
//#endregion

//#region Pricing
const pricingError = ref<string | null>(null);
const pricingLoading = ref(false);

// mapping: sizeCategoryId -> {priceDollars, durationMinutes}
const pricingMap = reactive<
  Record<number, { priceDollars: number | undefined; durationMinutes: number | undefined }>
>({});

// initialize existing data
for (const cat of categories.value) {
  const existing = serviceData.value?.pricing?.find((p) => p.sizeCategoryId === cat.id);

  pricingMap[cat.id] = {
    priceDollars: existing ? existing.priceCents / 100 : undefined,
    durationMinutes: existing?.durationMinutes ?? undefined,
  };
}

async function savePricing() {
  pricingError.value = null;
  pricingLoading.value = true;

  try {
    // we need to make sure we only send rows where both price and duration are present
    const pricing = Object.entries(pricingMap)
      .filter(([_, v]) => v.priceDollars != null && v.durationMinutes != null)
      .map(([sizeCategoryId, v]) => ({
        sizeCategoryId: Number(sizeCategoryId),
        priceCents: Math.round(v.priceDollars! * 100),
        durationMinutes: v.durationMinutes!,
      }));

    await $fetch(`/api/services/${serviceId}/pricing`, { method: 'PUT', body: { pricing } });
    await navigateTo('/employee/services');
  } catch (e: any) {
    pricingError.value = e.data?.message || 'Failed to save pricing';
  } finally {
    pricingLoading.value = false;
  }
}
//#endregion
</script>

<template>
  <div class="space-y-4">
    <!-- Service Details -->
    <div>
      <h1 class="text-2xl font-bold mb-6">{{ service.name }}</h1>
      <UAlert
        v-if="detailsError"
        color="error"
        icon="i-lucide-alert-circle"
        :title="detailsError"
        class="mb-4" />

      <ServicesForm
        :schema="updateServiceSchema"
        :initial-values="service"
        :loading="detailsLoading"
        submit-label="Save"
        @submit="onDetailsSubmit" />
    </div>

    <!-- Pricing -->
    <div>
      <h2 class="text-xl font-bold mb-4">Pricing</h2>
      <UAlert
        v-if="pricingError"
        color="error"
        icon="i-lucide-alert-circle"
        :title="pricingError"
        class="mb-4" />

      <div
        v-if="!categories.length"
        class="text-muted">
        No size categories found.
      </div>

      <div
        v-else
        class="space-y-2">
        <div
          v-for="cat in categories"
          :key="cat.id"
          class="flex items-center gap-4 p-3 border rounded-lg">
          <span class="w-24 font-medium text-sm">{{ cat.name }}</span>

          <UFormField
            label="Price ($)"
            class="flex-1">
            <UInputNumber
              v-model="pricingMap[cat.id]!.priceDollars"
              :min="0"
              :step="0.01" />
          </UFormField>

          <UFormField
            label="Duration (min)"
            class="flex-1">
            <UInputNumber
              v-model="pricingMap[cat.id]!.durationMinutes"
              :min="1"
              :step="5" />
          </UFormField>
        </div>

        <div class="flex justify-end pt-2">
          <UButton
            :loading="pricingLoading"
            @click="savePricing">
            Save
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
