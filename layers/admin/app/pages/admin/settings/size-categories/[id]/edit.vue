<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'size-category:manage',
});

const route = useRoute();
const toast = useToast();
const confirm = useConfirmDialog();
const categoryId = Number(route.params.id);

const { data: categoryData } = await useFetch(`/api/admin/size-categories/${categoryId}`);

if (!categoryData.value?.category) {
  throw createError({ statusCode: 404, message: 'Size category not found' });
}

const category = categoryData.value.category;

const initialValues = {
  name: category.name,
  minWeight: category.minWeight,
  maxWeight: category.maxWeight,
};

const deleteError = ref<string | null>(null);

async function onDelete() {
  const confirmed = await confirm({
    title: 'Delete size category?',
    description:
      'This action cannot be undone. Categories referenced by services or pets cannot be deleted.',
    confirmLabel: 'Delete',
    confirmColor: 'error',
  });

  if (!confirmed) return;

  deleteError.value = null;

  try {
    await $fetch(`/api/admin/size-categories/${categoryId}`, { method: 'DELETE' });
    toast.add({ title: 'Size category deleted', color: 'success' });
    await navigateTo('/admin/settings/size-categories');
  } catch (e: any) {
    deleteError.value = e.data?.message ?? e.message ?? 'Something went wrong';
  }
}
</script>

<template>
  <SizeCategoriesEditLayout
    mode="edit"
    :title="category.name"
    back-to="/admin/settings/size-categories"
    :initial-values="initialValues"
    :category-id="categoryId">
    <template #extra-actions>
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        label="Delete"
        size="sm"
        @click="onDelete" />
    </template>

    <template
      v-if="deleteError"
      #banner>
      <UAlert
        color="error"
        icon="i-lucide-alert-circle"
        title="Cannot delete"
        :description="deleteError"
        :close-button="{ icon: 'i-lucide-x' }"
        @close="deleteError = null" />
    </template>
  </SizeCategoriesEditLayout>
</template>
