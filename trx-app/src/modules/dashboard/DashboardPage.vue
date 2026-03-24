<template>
  <section class="space-y-6">
    <AppCard>
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</p>
          <p class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-100">{{ sessionStore.session?.role }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Company</p>
          <p class="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-100">{{ sessionStore.session?.companyName || '-' }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
          <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">DID</p>
          <p class="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-100">{{ sessionStore.session?.did }}</p>
        </div>
      </div>
    </AppCard>

    <p v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
      {{ error }}
    </p>

    <ShipperDashboard
      v-if="sessionStore.session?.role === 'SHIPPER' && sessionStore.session"
      :did="sessionStore.session.did"
      :load-id-standard="sessionStore.session.loadIdStandard || null"
    />
    <CarrierDashboard v-else-if="sessionStore.session" :did="sessionStore.session.did" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppCard from "@/shared/components/ui/AppCard.vue";
import { useSessionStore } from "@/stores/session";
import { TrxApiError, listOrders } from "@/services/trx/trxApi";
import ShipperDashboard from "@/modules/dashboard/ShipperDashboard.vue";
import CarrierDashboard from "@/modules/dashboard/CarrierDashboard.vue";

const router = useRouter();
const sessionStore = useSessionStore();
const error = ref("");

onMounted(async () => {
  sessionStore.hydrateFromStorage();

  if (!sessionStore.session) {
    await router.replace("/login");
    return;
  }

  try {
    await listOrders(sessionStore.session.did);
  } catch (validationError) {
    if (validationError instanceof TrxApiError && validationError.status === 401) {
      sessionStore.clearSession();
      await router.replace("/login");
      return;
    }

    error.value = validationError instanceof Error ? validationError.message : "Session validation failed";
  }
});
</script>
