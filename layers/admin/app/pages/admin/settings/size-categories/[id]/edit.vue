<script setup lang="ts">
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

async function onDelete() {
  const confirmed = await confirm({
    title: 'Delete size category?',
    description:
      'This action cannot be undone. Categories referenced by services or pets cannot be deleted.',
    confirmLabel: 'Delete',
    confirmColor: 'error',
  });

  if (!confirmed) return;

  try {
    await $fetch(`/api/admin/size-categories/${categoryId}`, { method: 'DELETE' });
    toast.add({ title: 'Size category deleted', color: 'success' });
    await navigateTo('/admin/settings/size-categories');
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
  <div class="space-y-6">
    <AppPageHeader
      :title="category.name"
      back-to="/admin/settings/size-categories">
      <template #actions>
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-trash-2"
          label="Delete"
          @click="onDelete" />
      </template>
    </AppPageHeader>

    <SizeCategoriesEditLayout
      mode="edit"
      :initial-values="initialValues"
      :category-id="categoryId" />
  </div>
</template>
