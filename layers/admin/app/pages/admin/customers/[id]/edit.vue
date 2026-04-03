<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'customer:manage',
});

const route = useRoute();
const id = route.params.id as string;

const { data } = await useFetch(`/api/admin/customers/${id}`);

if (!data.value?.customer) {
  throw createError({ statusCode: 404, message: 'Customer not found' });
}

const customer = data.value.customer;

const initialValues = {
  firstName: customer.firstName,
  lastName: customer.lastName,
  email: customer.email,
  phone: customer.phone,
};
</script>

<template>
  <div>
    <AppPageHeader
      title="Edit Customer"
      :back-to="`/admin/customers/${id}`" />

    <div class="py-4">
      <CustomersEditLayout
        :initial-values="initialValues"
        :customer-id="id" />
    </div>
  </div>
</template>
