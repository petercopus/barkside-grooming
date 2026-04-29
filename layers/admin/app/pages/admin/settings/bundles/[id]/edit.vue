<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});

const route = useRoute();
const bundleId = Number(route.params.id);

const { data } = await useFetch(`/api/admin/bundles/${bundleId}`);

if (!data.value?.bundle) {
  throw createError({ statusCode: 404, message: 'Bundle not found' });
}

const bundle = data.value.bundle;

const initialValues = {
  name: bundle.name,
  description: bundle.description,
  discountType: bundle.discountType,
  discountValue: bundle.discountValue,
  isActive: bundle.isActive,
  startDate: bundle.startDate,
  endDate: bundle.endDate,
  serviceIds: bundle.serviceIds,
};
</script>

<template>
  <BundlesEditLayout
    mode="edit"
    :title="bundle.name"
    back-to="/admin/settings/bundles"
    :initial-values="initialValues"
    :bundle-id="bundleId" />
</template>
