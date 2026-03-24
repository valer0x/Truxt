<template>
  <div class="surface-glow min-h-screen">
    <AppHeader />
    <main class="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from "@/shared/components/layout/AppHeader.vue";
</script>
