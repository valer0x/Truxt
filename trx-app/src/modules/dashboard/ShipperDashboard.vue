<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl text-slate-900 dark:text-slate-50">Shipper Control Center</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Loads are published as blockchain transactions. State updates propagate in real time.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <BaseButton variant="secondary" size="sm" @click="void fetchOrders(true)">Refresh</BaseButton>
        <BaseButton size="sm" @click="showComposer = !showComposer">
          {{ showComposer ? 'Hide composer' : 'Create load' }}
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <AppCard class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total loads</p>
        <p class="text-2xl font-semibold text-slate-900 dark:text-slate-50">{{ orders.length }}</p>
      </AppCard>
      <AppCard class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending</p>
        <p class="text-2xl font-semibold text-amber-600 dark:text-amber-300">{{ pendingCount }}</p>
      </AppCard>
      <AppCard class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Booked</p>
        <p class="text-2xl font-semibold text-sky-600 dark:text-sky-300">{{ bookedCount }}</p>
      </AppCard>
      <AppCard class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Done</p>
        <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{{ doneCount }}</p>
      </AppCard>
    </div>

    <AppCard class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-2 text-sm">
        <span class="inline-flex h-2.5 w-2.5 rounded-full" :class="liveDotClass" />
        <span class="text-slate-700 dark:text-slate-200">{{ liveStatusText }}</span>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400">
        Last sync: {{ lastSyncAt || 'Never' }}
      </p>
    </AppCard>

    <CreateLoadComposer
      v-if="showComposer"
      :actor-did="did"
      :load-id-standard="loadIdStandard"
      @created="handleCreated"
    />

    <AppCard v-if="loading">
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading shipper loads...</p>
    </AppCard>

    <AppCard v-else-if="error">
      <p class="text-sm text-rose-600 dark:text-rose-300">{{ error }}</p>
    </AppCard>

    <AppCard v-else-if="orders.length === 0">
      <p class="text-sm text-slate-500 dark:text-slate-400">No loads published yet. Use "Create load" to publish the first one.</p>
    </AppCard>

    <div v-else class="grid gap-4 lg:grid-cols-2">
      <AppCard v-for="order in orders" :key="order.order_id" class="space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ order.order_id }}</p>
            <h3 class="mt-1 text-base font-semibold text-slate-800 dark:text-slate-50">
              {{ order.payload_offledger.from }} -> {{ order.payload_offledger.to }}
            </h3>
          </div>
          <StatusBadge :state="order.verified_state" />
        </div>

        <div class="grid gap-2 text-sm sm:grid-cols-2">
          <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Pickup:</span> {{ order.payload_offledger.pickup_date }}</p>
          <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Weight:</span> {{ order.payload_offledger.weight.toLocaleString() }} lbs</p>
          <p class="break-all text-slate-600 dark:text-slate-300"><span class="font-semibold">Reference:</span> {{ order.payload_offledger.reference || '-' }}</p>
          <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Carrier:</span> {{ order.carrier_did ? `${order.carrier_did.slice(0, 18)}...` : '-' }}</p>
        </div>

        <div class="flex items-center justify-between">
          <VerifiedBadge :verified="order.verified" />
          <ProofModal :proof="order.verified_proof" />
        </div>
      </AppCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { VerifiedOrderRow } from "@/domain/types";
import { TrxApiError, listOrders } from "@/services/trx/trxApi";
import { useLiveOrderSync } from "@/shared/composables/useLiveOrderSync";
import AppCard from "@/shared/components/ui/AppCard.vue";
import BaseButton from "@/shared/components/ui/BaseButton.vue";
import StatusBadge from "@/shared/components/ui/StatusBadge.vue";
import VerifiedBadge from "@/shared/components/ui/VerifiedBadge.vue";
import ProofModal from "@/shared/components/ui/ProofModal.vue";
import CreateLoadComposer from "@/modules/dashboard/CreateLoadComposer.vue";

const props = defineProps<{
  did: string;
  loadIdStandard: string | null;
}>();

const orders = ref<VerifiedOrderRow[]>([]);
const loading = ref(true);
const error = ref("");
const showComposer = ref(false);
const lastSyncAt = ref("");

const pendingCount = computed(() => orders.value.filter((order) => order.verified_state === "PENDING").length);
const bookedCount = computed(() => orders.value.filter((order) => order.verified_state === "BOOKED").length);
const doneCount = computed(() => orders.value.filter((order) => order.verified_state === "DONE").length);

const liveSync = useLiveOrderSync(async () => {
  await fetchOrders(true);
});

const liveStatusText = computed(() => {
  if (liveSync.syncing.value) {
    return "Syncing blockchain events...";
  }

  if (liveSync.lastEvent.value) {
    return `Live network event: ${liveSync.lastEvent.value.type} (${liveSync.lastEvent.value.order_id})`;
  }

  return "Live sync active";
});

const liveDotClass = computed(() => {
  if (liveSync.syncing.value) {
    return "bg-amber-500";
  }

  if (liveSync.lastEvent.value) {
    return "bg-emerald-500";
  }

  return "bg-sky-500";
});

async function fetchOrders(silent = false): Promise<void> {
  if (!silent) {
    loading.value = true;
  }

  error.value = "";

  try {
    const response = await listOrders(props.did);
    if (!("orders" in response)) {
      throw new Error("Unexpected response for shipper dashboard");
    }

    orders.value = response.orders;
    lastSyncAt.value = new Date().toLocaleTimeString();
  } catch (loadError) {
    if (loadError instanceof TrxApiError) {
      error.value = loadError.message;
    } else if (loadError instanceof Error) {
      error.value = loadError.message;
    } else {
      error.value = "Unable to load orders";
    }
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
}

async function handleCreated(): Promise<void> {
  showComposer.value = false;
  await fetchOrders(true);
}

onMounted(() => {
  liveSync.start();
  void fetchOrders();
});

onUnmounted(() => {
  liveSync.stop();
});
</script>
