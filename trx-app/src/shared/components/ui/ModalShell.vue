<template>
  <Transition name="fade-slide">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button class="absolute inset-0 bg-slate-950/45" aria-label="Close modal" @click="$emit('close')" />
      <div class="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-lg text-slate-900 dark:text-slate-50">{{ title }}</h3>
          <button type="button" class="rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-600" @click="$emit('close')">Close</button>
        </div>
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean;
  title: string;
}>();

defineEmits<{
  close: [];
}>();
</script>
