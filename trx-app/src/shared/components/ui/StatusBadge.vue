<template>
  <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold" :class="badgeClass">{{ state }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { OrderState } from "@/domain/types";

const props = defineProps<{ state: OrderState }>();

const badgeClass = computed(() => {
  switch (props.state) {
    case "PENDING":
      return "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
    case "BOOKED":
      return "border-sky-200 bg-sky-100 text-sky-800 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-200";
    case "DONE":
      return "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "CANCELLED":
      return "border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
});
</script>
