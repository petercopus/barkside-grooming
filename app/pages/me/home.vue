<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const { user, permissions } = useAuth();
</script>

<template>
  <div>
    <AppPageHeader
      :title="`Welcome, ${user?.firstName}`"
      description="Lorem ipsum, dolor sit amet consectetur adipisicing." />

    <!-- TODO: remove this, for testing for now -->
    <div class="mt-6 p-4">
      <h2 class="text-sm font-semibold mb-2">Permissions:</h2>
      <ul class="text-xs space-y-1">
        <li
          v-for="perm in permissions"
          :key="perm">
          {{ perm }}
        </li>
      </ul>
    </div>
    <!-- TODO: END TODO -->
  </div>
</template>
