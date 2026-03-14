<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

const { user, permissions } = useAuth();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">Welcome, {{ user?.firstName }}</h1>
    <p class="text-muted mt-1">Lorem ipsum, dolor sit amet consectetur adipisicing.</p>

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
