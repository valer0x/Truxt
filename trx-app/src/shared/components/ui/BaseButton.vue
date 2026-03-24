<template>
  <button
    class="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
    :class="[sizeClass, variantClass, block ? 'w-full' : '']"
    :disabled="disabled || loading"
    :type="type"
  >
    <span v-if="loading" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "success";
    size?: "sm" | "md";
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    variant: "primary",
    size: "md",
    loading: false,
    disabled: false,
    block: false,
    type: "button",
  }
);

const sizeClass = computed(() => {
  if (props.size === "sm") {
    return "px-3 py-2 text-xs";
  }

  return "px-4 py-2.5 text-sm";
});

const variantClass = computed(() => {
  switch (props.variant) {
    case "secondary":
      return "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
    case "ghost":
      return "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
    case "success":
      return "bg-emerald-600 text-white hover:bg-emerald-700";
    default:
      return "bg-trx-600 text-white hover:bg-trx-700";
  }
});
</script>
