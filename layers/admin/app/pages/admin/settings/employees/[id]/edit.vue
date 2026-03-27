<script setup lang="ts">
const route = useRoute();
const id = route.params.id as string;

const { data: empData } = await useFetch(`/api/admin/employees/${id}`);

if (!empData.value?.employee) {
  throw createError({ statusCode: 404, message: 'Employee not found' });
}

const emp = empData.value.employee;

const initialValues = {
  email: emp.email,
  firstName: emp.firstName,
  lastName: emp.lastName,
  phone: emp.phone,
  isActive: emp.isActive,
  roleIds: emp.roles.map((r) => r.id),
  serviceIds: emp.serviceIds,
};
</script>

<template>
  <div class="space-y-6">
    <AppPageHeader
      title="Edit Employee"
      back-to="/admin/settings/employees">
      <template #actions>
        <UButton
          :to="`/admin/settings/employees/${id}/schedule`"
          icon="i-lucide-calendar"
          label="Manage Schedule"
          variant="outline" />
      </template>
    </AppPageHeader>

    <EmployeesEditLayout
      mode="edit"
      :initial-values="initialValues"
      :employee-id="id" />
  </div>
</template>
