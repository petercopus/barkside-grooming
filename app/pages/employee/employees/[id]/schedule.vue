<script setup lang="ts">
import type { CreateOverrideInput } from '~~/shared/schemas/schedule';

definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'employee:manage',
});

const route = useRoute();
const id = route.params.id as string;

const { data: empData } = await useFetch(`/api/employees/${id}`);
const { data: scheduleData, refresh: refreshSchedule } = await useFetch(
  `/api/employees/${id}/schedule`,
);
const { data: overridesData, refresh: refreshOverrides } = await useFetch(
  `/api/employees/${id}/overrides`,
);

if (!empData.value?.employee) {
  throw createError({ statusCode: 404, message: 'Employee not found' });
}

const employeeName = computed(
  () => `${empData.value!.employee.firstName} ${empData.value!.employee.lastName}`,
);

//#region Weekly schedule
const scheduleError = ref<string | null>(null);
const scheduleSuccess = ref<string | null>(null);
const scheduleLoading = ref(false);

async function saveSchedule(
  entries: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[],
) {
  scheduleError.value = null;
  scheduleSuccess.value = null;
  scheduleLoading.value = true;

  try {
    await $fetch(`/api/employees/${id}/schedule`, {
      method: 'PUT',
      body: { entries },
    });
    scheduleSuccess.value = 'Schedule saved';
    await refreshSchedule();
  } catch (e: any) {
    scheduleError.value = e.data?.message ?? 'Failed to save schedule';
  } finally {
    scheduleLoading.value = false;
  }
}
//#endregion

//#region Overrides
const overrideError = ref<string | null>(null);
const overrideSuccess = ref<string | null>(null);
const overrideLoading = ref(false);
const showOverrideForm = ref(false);
const editingOverride = ref<(typeof overrideRows.value)[number] | null>(null);

const overrideRows = computed(() => overridesData.value?.overrides ?? []);

const overrideColumns = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'isAvailable', header: 'Status' },
  { accessorKey: 'times', header: 'Hours' },
  { accessorKey: 'reason', header: 'Reason' },
  { accessorKey: 'actions', header: '' },
];

function startAddOverride() {
  editingOverride.value = null;
  showOverrideForm.value = true;
}

function startEditOverride(override: (typeof overrideRows.value)[number]) {
  editingOverride.value = override;
  showOverrideForm.value = true;
}

async function onOverrideSubmit(data: CreateOverrideInput) {
  overrideError.value = null;
  overrideSuccess.value = null;
  overrideLoading.value = true;

  try {
    if (editingOverride.value) {
      await $fetch(`/api/employees/${id}/overrides/${editingOverride.value.id}`, {
        method: 'PATCH',
        body: data,
      });
      overrideSuccess.value = 'Override updated';
    } else {
      await $fetch(`/api/employees/${id}/overrides`, {
        method: 'POST',
        body: data,
      });
      overrideSuccess.value = 'Override added';
    }

    showOverrideForm.value = false;
    editingOverride.value = null;
    await refreshOverrides();
  } catch (e: any) {
    overrideError.value = e.data?.message ?? 'Failed to save override';
  } finally {
    overrideLoading.value = false;
  }
}

async function deleteOverride(overrideId: number) {
  overrideError.value = null;
  overrideSuccess.value = null;

  try {
    await $fetch(`/api/employees/${id}/overrides/${overrideId}`, {
      method: 'DELETE',
    });
    overrideSuccess.value = 'Override deleted';
    await refreshOverrides();
  } catch (e: any) {
    overrideError.value = e.data?.message ?? 'Failed to delete override';
  }
}
//#endregion
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center gap-4">
      <UButton
        :to="`/employee/employees/${id}/edit`"
        icon="i-lucide-arrow-left"
        variant="ghost"
        size="sm" />
      <h1 class="text-2xl font-bold">Schedule — {{ employeeName }}</h1>
    </div>

    <!-- Weekly Schedule -->
    <UCard>
      <template #header>
        <h2 class="font-semibold">Weekly Hours</h2>
      </template>

      <UAlert
        v-if="scheduleError"
        color="error"
        :title="scheduleError"
        class="mb-4" />

      <UAlert
        v-if="scheduleSuccess"
        color="success"
        :title="scheduleSuccess"
        class="mb-4" />

      <ScheduleWeeklyEditor
        :entries="scheduleData?.entries ?? []"
        :loading="scheduleLoading"
        @save="saveSchedule" />
    </UCard>

    <!-- Schedule Overrides -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Schedule Overrides</h2>
          <UButton
            v-if="!showOverrideForm"
            icon="i-lucide-plus"
            label="Add Override"
            size="sm"
            @click="startAddOverride" />
        </div>
      </template>

      <UAlert
        v-if="overrideError"
        color="error"
        :title="overrideError"
        class="mb-4" />

      <UAlert
        v-if="overrideSuccess"
        color="success"
        :title="overrideSuccess"
        class="mb-4" />

      <!-- Add/Edit form -->
      <div
        v-if="showOverrideForm"
        class="mb-6 p-4 border rounded-lg">
        <h3 class="font-medium mb-3">
          {{ editingOverride ? 'Edit Override' : 'New Override' }}
        </h3>
        <ScheduleOverrideForm
          :initial-values="editingOverride ?? undefined"
          :loading="overrideLoading"
          @submit="onOverrideSubmit"
          @cancel="showOverrideForm = false" />
      </div>

      <!-- Overrides table -->
      <UTable
        v-if="overrideRows.length > 0"
        :data="overrideRows"
        :columns="overrideColumns">
        <template #isAvailable-cell="{ row }">
          <UBadge
            :color="row.original.isAvailable ? 'success' : 'warning'"
            variant="subtle">
            {{ row.original.isAvailable ? 'Working' : 'Day Off' }}
          </UBadge>
        </template>

        <template #times-cell="{ row }">
          <span v-if="row.original.isAvailable && row.original.startTime">
            {{ row.original.startTime.slice(0, 5) }} – {{ row.original.endTime?.slice(0, 5) }}
          </span>
          <span
            v-else
            class="text-muted">
            —
          </span>
        </template>

        <template #reason-cell="{ row }">
          {{ row.original.reason || '—' }}
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-1">
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              size="sm"
              @click="startEditOverride(row.original)" />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              @click="deleteOverride(row.original.id)" />
          </div>
        </template>
      </UTable>

      <p
        v-else-if="!showOverrideForm"
        class="text-sm text-muted">
        No overrides scheduled.
      </p>
    </UCard>
  </div>
</template>
