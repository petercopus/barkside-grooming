<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'permission',
  permission: 'admin:access',
  redirect: '/admin/home',
});
</script>
