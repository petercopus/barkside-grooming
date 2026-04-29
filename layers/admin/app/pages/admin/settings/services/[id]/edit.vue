<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});

const route = useRoute();
const serviceId = Number(route.params.id);

const { data: serviceData } = await useFetch(`/api/admin/services/${serviceId}`);
const { data: addonData } = await useFetch(`/api/admin/services/${serviceId}/addons`);

if (!serviceData.value?.service) {
  throw createError({ statusCode: 404, message: 'Service not found' });
}

const service = serviceData.value.service;

const initialValues = {
  name: service.name,
  description: service.description,
  category: service.category,
  isAddon: service.isAddon,
  sortOrder: service.sortOrder,
};
</script>

<template>
  <ServicesEditLayout
    mode="edit"
    :title="service.name"
    back-to="/admin/settings/services"
    :initial-values="initialValues"
    :initial-pricing="serviceData?.pricing ?? []"
    :initial-addon-links="addonData"
    :service-id="serviceId" />
</template>
