<template>
  <header class="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85">
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <RouterLink class="flex items-center gap-3" to="/dashboard">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-trx-600 text-sm font-display font-semibold text-white shadow-md">
          TX
        </span>
        <div>
          <p class="font-display text-base leading-none text-slate-900 dark:text-slate-100">TRX Console</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">IOTA verified anti-phantom loads</p>
        </div>
      </RouterLink>

      <nav class="hidden items-center gap-3 md:flex">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="route.name === item.name ? 'bg-trx-100 text-trx-800 dark:bg-trx-900/40 dark:text-trx-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="hidden items-center gap-3 md:flex">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          :aria-label="themeStore.mode === 'light' ? 'Enable dark mode' : 'Enable light mode'"
          @click="themeStore.toggleTheme"
        >
          <span v-if="themeStore.mode === 'light'">Moon</span>
          <span v-else>Sun</span>
        </button>

        <div v-if="sessionStore.session" class="text-right">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-100">
            {{ sessionStore.session.companyName || sessionStore.session.walletAddress }}
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">{{ sessionStore.session.role }} · {{ shortDid }}</p>
        </div>

        <button
          v-if="sessionStore.session"
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
          @click="handleDisconnect"
        >
          Disconnect
        </button>
      </div>

      <button
        type="button"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-200"
        aria-label="Toggle navigation"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <span v-if="mobileMenuOpen">X</span>
        <span v-else>Menu</span>
      </button>
    </div>

    <Transition name="fade-slide">
      <div v-if="mobileMenuOpen" class="border-t border-slate-200 bg-white px-4 py-4 md:hidden dark:border-slate-800 dark:bg-slate-900">
        <div class="space-y-2">
          <RouterLink
            v-for="item in navItems"
            :key="`mobile-${item.to}`"
            :to="item.to"
            class="block rounded-lg px-3 py-2 text-sm font-medium"
            :class="route.name === item.name ? 'bg-trx-100 text-trx-800 dark:bg-trx-900/40 dark:text-trx-200' : 'text-slate-600 dark:text-slate-300'"
            @click="mobileMenuOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </div>

        <div class="mt-4 flex items-center justify-between rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
          <div>
            <p class="font-semibold text-slate-700 dark:text-slate-100">{{ sessionStore.session?.companyName || sessionStore.session?.walletAddress || 'Guest' }}</p>
            <p class="text-slate-500 dark:text-slate-400">{{ sessionStore.session?.role || 'Not connected' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-md border border-slate-300 px-2 py-1 text-slate-600 dark:border-slate-600 dark:text-slate-300"
              @click="themeStore.toggleTheme"
            >
              {{ themeStore.mode === 'light' ? 'Dark' : 'Light' }}
            </button>
            <button
              v-if="sessionStore.session"
              type="button"
              class="rounded-md border border-slate-300 px-2 py-1 text-slate-600 dark:border-slate-600 dark:text-slate-300"
              @click="handleDisconnect"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { useThemeStore } from "@/stores/theme";
import { useIotaWallet } from "@/shared/composables/useIotaWallet";

const sessionStore = useSessionStore();
const themeStore = useThemeStore();
const wallet = useIotaWallet();
const route = useRoute();
const router = useRouter();
const mobileMenuOpen = ref(false);

const navItems = computed(() => {
  if (sessionStore.isAuthenticated) {
    return [{ name: "dashboard", to: "/dashboard", label: "Dashboard" }];
  }

  return [
    { name: "login", to: "/login", label: "Login" },
    { name: "onboarding", to: "/onboarding", label: "Onboarding" },
  ];
});

const shortDid = computed(() => {
  const did = sessionStore.session?.did;
  if (!did) {
    return "-";
  }

  return `${did.slice(0, 18)}...`;
});

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false;
  }
);

async function handleDisconnect(): Promise<void> {
  await wallet.disconnect();
  sessionStore.clearSession();
  sessionStore.setPendingOnboardingWallet(null);
  await router.push("/login");
}
</script>
