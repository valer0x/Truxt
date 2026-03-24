<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold"
    :class="verified ? 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200'"
  >
    <span>{{ verified ? 'VERIFIED' : 'UNVERIFIED' }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ verified: boolean }>();
</script>
