<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:manage',
});

const route = useRoute();
const toast = useToast();
const confirm = useConfirmDialog();
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

async function onDelete() {
  const confirmed = await confirm({
    title: 'Delete bundle?',
    description:
      'This hides the bundle from the public catalog and booking flow. Past appointments keep their record.',
    confirmLabel: 'Delete',
    confirmColor: 'error',
  });

  if (!confirmed) return;

  try {
    await $fetch(`/api/admin/bundles/${bundleId}`, { method: 'DELETE' });
    toast.add({ title: 'Bundle deleted', color: 'success' });
    await navigateTo('/admin/settings/bundles');
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
  <BundlesEditLayout
    mode="edit"
    :title="bundle.name"
    back-to="/admin/settings/bundles"
    :initial-values="initialValues"
    :bundle-id="bundleId">
    <template #extra-actions>
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        label="Delete"
        size="sm"
        @click="onDelete" />
    </template>
  </BundlesEditLayout>
</template>
