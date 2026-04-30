<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});

const route = useRoute();
const toast = useToast();
const confirm = useConfirmDialog();
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
  isActive: service.isActive,
  sortOrder: service.sortOrder,
};

async function onDelete() {
  const confirmed = await confirm({
    title: 'Delete service?',
    description:
      'This hides the service from the public catalog and booking flow. Past appointments keep their record.',
    confirmLabel: 'Delete',
    confirmColor: 'error',
  });

  if (!confirmed) return;

  try {
    await $fetch(`/api/admin/services/${serviceId}`, { method: 'DELETE' });
    toast.add({ title: 'Service deleted', color: 'success' });
    await navigateTo('/admin/settings/services');
  } catch (e: any) {
    toast.add({
      title: 'Cannot delete',
      description: e.data?.message ?? e.message ?? 'Something went wrong',
      color: 'error',
    });
  }
}
</script>

<template>
  <ServicesEditLayout
    mode="edit"
    :title="service.name"
    back-to="/admin/settings/services"
    :initial-values="initialValues"
    :initial-pricing="serviceData?.pricing ?? []"
    :initial-addon-links="addonData"
    :service-id="serviceId">
    <template #extra-actions>
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        label="Delete"
        size="sm"
        @click="onDelete" />
    </template>
  </ServicesEditLayout>
</template>
