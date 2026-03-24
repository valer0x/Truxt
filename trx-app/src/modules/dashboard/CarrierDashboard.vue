<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="font-display text-2xl text-slate-900 dark:text-slate-50">Carrier Command Center</h2>
        <p class="text-sm text-slate-600 dark:text-slate-300">
          Loads update in real time from network events. No page refresh required.
        </p>
      </div>
      <BaseButton variant="secondary" size="sm" @click="void fetchOrders(true)">Refresh</BaseButton>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <AppCard class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Available</p>
        <p class="text-2xl font-semibold text-trx-700 dark:text-trx-200">{{ pending.length }}</p>
      </AppCard>
      <AppCard class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">My booked</p>
        <p class="text-2xl font-semibold text-sky-600 dark:text-sky-300">{{ myBooked.length }}</p>
      </AppCard>
      <AppCard class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Completed</p>
        <p class="text-2xl font-semibold text-emerald-600 dark:text-emerald-300">{{ myDone.length }}</p>
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

    <AppCard
      v-if="!onChainReady.isReady.value"
      class="border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
    >
      <p class="text-sm text-amber-700 dark:text-amber-200">{{ onChainReady.readinessMessage.value }}</p>
    </AppCard>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="rounded-xl border px-3 py-2 text-xs font-semibold transition"
        :class="activeTab === tab.value
          ? 'border-trx-300 bg-trx-100 text-trx-800 dark:border-trx-700 dark:bg-trx-900/30 dark:text-trx-200'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <AppCard v-if="loading">
      <p class="text-sm text-slate-500 dark:text-slate-400">Loading carrier dashboard...</p>
    </AppCard>

    <AppCard v-else-if="error">
      <p class="text-sm text-rose-600 dark:text-rose-300">{{ error }}</p>
    </AppCard>

    <div v-else>
      <div v-if="activeTab === 'available'" class="grid gap-4 lg:grid-cols-2">
        <AppCard v-for="order in pending" :key="`pending-${order.order_id}`" class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ order.order_id }}</p>
              <h3 class="mt-1 text-base font-semibold text-slate-800 dark:text-slate-50">{{ order.payload_offledger.from }} -> {{ order.payload_offledger.to }}</h3>
            </div>
            <VerifiedBadge :verified="order.verified" />
          </div>

          <div class="grid gap-2 text-sm sm:grid-cols-2">
            <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Pickup:</span> {{ order.payload_offledger.pickup_date }}</p>
            <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Weight:</span> {{ order.payload_offledger.weight.toLocaleString() }} lbs</p>
            <p class="break-all text-slate-600 dark:text-slate-300"><span class="font-semibold">Shipper DID:</span> {{ order.issuer_did.slice(0, 16) }}...</p>
            <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Status:</span> {{ order.verified_state }}</p>
          </div>

          <div class="flex items-center justify-between gap-3">
            <ProofModal :proof="order.verified_proof" />
            <BaseButton
              size="sm"
              :disabled="!onChainReady.isReady.value || !canBook(order) || actionLoading === order.order_id"
              :loading="actionLoading === order.order_id"
              @click="handleBook(order.order_id)"
            >
              Book
            </BaseButton>
          </div>
        </AppCard>

        <AppCard v-if="pending.length === 0" class="lg:col-span-2">
          <p class="text-sm text-slate-500 dark:text-slate-400">No pending loads available.</p>
        </AppCard>
      </div>

      <div v-else-if="activeTab === 'booked'" class="grid gap-4 lg:grid-cols-2">
        <AppCard v-for="order in myBooked" :key="`booked-${order.order_id}`" class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ order.order_id }}</p>
              <h3 class="mt-1 text-base font-semibold text-slate-800 dark:text-slate-50">{{ order.payload_offledger.from }} -> {{ order.payload_offledger.to }}</h3>
            </div>
            <StatusBadge :state="order.verified_state" />
          </div>

          <div class="grid gap-2 text-sm sm:grid-cols-2">
            <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Pickup:</span> {{ order.payload_offledger.pickup_date }}</p>
            <p class="text-slate-600 dark:text-slate-300"><span class="font-semibold">Reference:</span> {{ order.payload_offledger.reference || '-' }}</p>
          </div>

          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <VerifiedBadge :verified="order.verified" />
              <ProofModal :proof="order.verified_proof" />
            </div>
            <BaseButton
              variant="success"
              size="sm"
              :disabled="!onChainReady.isReady.value || !canMarkDone(order) || actionLoading === order.order_id"
              :loading="actionLoading === order.order_id"
              @click="handleDone(order.order_id)"
            >
              Mark as done
            </BaseButton>
          </div>
        </AppCard>

        <AppCard v-if="myBooked.length === 0" class="lg:col-span-2">
          <p class="text-sm text-slate-500 dark:text-slate-400">You have no booked loads yet.</p>
        </AppCard>
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-2">
        <AppCard v-for="order in myDone" :key="`done-${order.order_id}`" class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-mono text-xs text-slate-500 dark:text-slate-400">{{ order.order_id }}</p>
              <h3 class="mt-1 text-base font-semibold text-slate-800 dark:text-slate-50">{{ order.payload_offledger.from }} -> {{ order.payload_offledger.to }}</h3>
            </div>
            <StatusBadge :state="order.verified_state" />
          </div>

          <div class="flex items-center justify-between gap-3">
            <VerifiedBadge :verified="order.verified" />
            <ProofModal :proof="order.verified_proof" />
          </div>
        </AppCard>

        <AppCard v-if="myDone.length === 0" class="lg:col-span-2">
          <p class="text-sm text-slate-500 dark:text-slate-400">No completed loads yet.</p>
        </AppCard>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import type { VerifiedOrderRow } from "@/domain/types";
import { TrxApiError, bookOrder, listOrders, markOrderDone } from "@/services/trx/trxApi";
import { useLiveOrderSync } from "@/shared/composables/useLiveOrderSync";
import { useOnChainWriteReadiness } from "@/shared/composables/useOnChainWriteReadiness";
import AppCard from "@/shared/components/ui/AppCard.vue";
import BaseButton from "@/shared/components/ui/BaseButton.vue";
import StatusBadge from "@/shared/components/ui/StatusBadge.vue";
import VerifiedBadge from "@/shared/components/ui/VerifiedBadge.vue";
import ProofModal from "@/shared/components/ui/ProofModal.vue";

const props = defineProps<{ did: string }>();

const pending = ref<VerifiedOrderRow[]>([]);
const myBooked = ref<VerifiedOrderRow[]>([]);
const myDone = ref<VerifiedOrderRow[]>([]);
const loading = ref(true);
const actionLoading = ref<string | null>(null);
const error = ref("");
const lastSyncAt = ref("");
const activeTab = ref<"available" | "booked" | "done">("available");

const tabs = computed(() => [
  { value: "available" as const, label: `Available (${pending.value.length})` },
  { value: "booked" as const, label: `Booked (${myBooked.value.length})` },
  { value: "done" as const, label: `Completed (${myDone.value.length})` },
]);
const onChainReady = useOnChainWriteReadiness();

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
    if ("orders" in response) {
      throw new Error("Unexpected response for carrier dashboard");
    }

    pending.value = response.pending;
    myBooked.value = response.my_booked;
    myDone.value = response.my_done;
    lastSyncAt.value = new Date().toLocaleTimeString();
  } catch (loadError) {
    if (loadError instanceof TrxApiError) {
      error.value = loadError.message;
    } else if (loadError instanceof Error) {
      error.value = loadError.message;
    } else {
      error.value = "Unable to load carrier dashboard";
    }
  } finally {
    if (!silent) {
      loading.value = false;
    }
  }
}

function canBook(order: VerifiedOrderRow): boolean {
  const isLocked = order.carrier_did !== null && order.carrier_did !== props.did;
  return order.verified && !isLocked;
}

function canMarkDone(order: VerifiedOrderRow): boolean {
  return order.verified && order.carrier_did === props.did && order.verified_state === "BOOKED";
}

async function handleBook(orderId: string): Promise<void> {
  if (!onChainReady.isReady.value) {
    error.value = onChainReady.readinessMessage.value;
    return;
  }

  actionLoading.value = orderId;
  try {
    await bookOrder(orderId, props.did);
    await fetchOrders(true);
  } catch (bookError) {
    error.value = bookError instanceof Error ? bookError.message : "Booking failed";
  } finally {
    actionLoading.value = null;
  }
}

async function handleDone(orderId: string): Promise<void> {
  if (!onChainReady.isReady.value) {
    error.value = onChainReady.readinessMessage.value;
    return;
  }

  actionLoading.value = orderId;
  try {
    await markOrderDone(orderId, props.did);
    await fetchOrders(true);
  } catch (doneError) {
    error.value = doneError instanceof Error ? doneError.message : "Unable to mark load as done";
  } finally {
    actionLoading.value = null;
  }
}

onMounted(() => {
  liveSync.start();
  void fetchOrders();
});

onUnmounted(() => {
  liveSync.stop();
});
</script>
