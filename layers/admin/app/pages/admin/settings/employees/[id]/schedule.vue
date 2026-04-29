<script setup lang="ts">
import type { CreateOverrideInput } from '~~/shared/schemas/schedule';

definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'employee:manage',
});

const route = useRoute();
const id = route.params.id as string;

const { data: empData } = await useFetch(`/api/admin/employees/${id}`);
const { data: scheduleData, refresh: refreshSchedule } = await useFetch(
  `/api/admin/employees/${id}/schedule`,
);
const { data: overridesData, refresh: refreshOverrides } = await useFetch(
  `/api/admin/employees/${id}/overrides`,
);

if (!empData.value?.employee) {
  throw createError({ statusCode: 404, message: 'Employee not found' });
}

const employeeName = computed(
  () => `${empData.value!.employee.firstName} ${empData.value!.employee.lastName}`,
);

//#region Weekly schedule
const schedule = useFormAction({
  successMessage: 'Schedule saved',
  onSuccess: () => refreshSchedule(),
});

async function saveSchedule(
  entries: { dayOfWeek: number; startTime: string; endTime: string; isAvailable: boolean }[],
) {
  await schedule.execute(() =>
    $fetch(`/api/admin/employees/${id}/schedule`, { method: 'PUT', body: { entries } }),
  );
}
//#endregion

//#region Overrides
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

const overrideSubmit = useFormAction({
  onSuccess: () => {
    showOverrideForm.value = false;
    editingOverride.value = null;
    return refreshOverrides();
  },
});

async function onOverrideSubmit(data: CreateOverrideInput) {
  const isEdit = editingOverride.value;
  overrideSubmit.execute(async () => {
    if (isEdit) {
      await $fetch(`/api/admin/employees/${id}/overrides/${isEdit.id}`, {
        method: 'PATCH',
        body: data,
      });
    } else {
      await $fetch(`/api/admin/employees/${id}/overrides`, {
        method: 'POST',
        body: data,
      });
    }
  });
}

const overrideDelete = useFormAction({
  successMessage: 'Override deleted',
  onSuccess: () => refreshOverrides(),
});

async function deleteOverride(overrideId: number) {
  await overrideDelete.execute(() =>
    $fetch(`/api/admin/employees/${id}/overrides/${overrideId}`, { method: 'DELETE' }),
  );
}
//#endregion
</script>

<template>
  <AppPage
    :title="`Schedule — ${employeeName}`"
    :back-to="`/admin/settings/employees/${id}/edit`"
    width="wide">
    <!-- Weekly Schedule -->
    <AppSection
      title="Weekly Hours"
      :error="schedule.error.value">
      <ScheduleWeeklyEditor
        :entries="scheduleData?.entries ?? []"
        :loading="schedule.loading.value"
        @save="saveSchedule" />
    </AppSection>

    <!-- Schedule Overrides -->
    <AppSection
      title="Schedule Overrides"
      :error="overrideSubmit.error.value || overrideDelete.error.value">
      <template #actions>
        <UButton
          v-if="!showOverrideForm"
          icon="i-lucide-plus"
          label="Add Override"
          size="sm"
          @click="startAddOverride" />
      </template>

      <!-- Add/Edit form -->
      <div
        v-if="showOverrideForm"
        class="mb-6 p-4 border border-default rounded-lg">
        <h3 class="font-medium mb-3">
          {{ editingOverride ? 'Edit Override' : 'New Override' }}
        </h3>
        <ScheduleOverrideForm
          :initial-values="editingOverride ?? undefined"
          :loading="overrideSubmit.loading.value"
          @submit="onOverrideSubmit"
          @cancel="showOverrideForm = false" />
      </div>

      <!-- Overrides table -->
      <UTable
        v-if="overrideRows.length > 0"
        :data="overrideRows"
        :columns="overrideColumns">
        <template #date-cell="{ row }">
          {{ formatDate(row.original.date) }}
        </template>

        <template #isAvailable-cell="{ row }">
          <UBadge
            :color="row.original.isAvailable ? 'success' : 'warning'"
            variant="subtle">
            {{ row.original.isAvailable ? 'Working' : 'Day Off' }}
          </UBadge>
        </template>

        <template #times-cell="{ row }">
          <span v-if="row.original.isAvailable && row.original.startTime">
            {{ formatTimeRange(row.original.startTime, row.original.endTime) }}
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
    </AppSection>
  </AppPage>
</template>
