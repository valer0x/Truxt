<template>
  <label class="block space-y-1.5">
    <span v-if="label" class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ label }}</span>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      class="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-trx-500 focus:ring-2 focus:ring-trx-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-trx-900"
    />
  </label>
</template>

<script setup lang="ts">
const model = defineModel<string | number>({ required: true });

defineProps<{
  id?: string;
  label?: string;
  placeholder?: string;
  type?: string;
}>();
</script>
