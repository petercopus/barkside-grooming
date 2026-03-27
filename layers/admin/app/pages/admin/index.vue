<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'service:read',
  redirect: '/admin/home',
});
</script>
