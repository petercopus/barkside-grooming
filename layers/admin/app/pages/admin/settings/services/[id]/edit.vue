<script setup lang="ts">
const route = useRoute();
const serviceId = Number(route.params.id);

const { data: serviceData } = await useFetch(`/api/admin/services/${serviceId}`);

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
  <div class="space-y-6">
    <AppPageHeader
      :title="service.name"
      back-to="/admin/settings/services" />

    <ServicesEditLayout
      mode="edit"
      :initial-values="initialValues"
      :initial-pricing="serviceData?.pricing ?? []"
      :service-id="serviceId" />
  </div>
</template>
