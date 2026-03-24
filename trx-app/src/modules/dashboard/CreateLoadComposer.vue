<template>
  <AppCard class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-display text-lg text-slate-900 dark:text-slate-50">Create New Load Transaction</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Every submission is anchored as a blockchain transaction and broadcast as a network event.
        </p>
      </div>
      <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
        On-chain
      </span>
    </div>

    <form class="space-y-3" @submit.prevent="submitForm">
      <BaseInput v-model="shipmentId" label="Shipment ID" placeholder="SHP-2026-00123" />

      <div class="grid gap-3 sm:grid-cols-2">
        <BaseSelect
          v-model="processType"
          label="Process type"
          :options="[
            { label: 'Tendering', value: 'Tendering' },
            { label: 'Auction', value: 'Auction' },
            { label: 'Direct Book', value: 'Direct Book' },
          ]"
        />
        <BaseSelect
          v-model="loadType"
          label="Service class"
          :options="[
            { label: 'FTL', value: 'FTL' },
            { label: 'LTL', value: 'LTL' },
          ]"
        />
      </div>

      <BaseInput v-model="cmrReference" label="CMR reference" placeholder="CMR-IT-2026-001" />

      <div class="grid gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 sm:grid-cols-2">
        <label class="inline-flex items-center gap-2">
          <input v-model="sponda" type="checkbox" />
          <span>Sponda</span>
        </label>
        <label class="inline-flex items-center gap-2">
          <input v-model="adr" type="checkbox" />
          <span>ADR</span>
        </label>
        <BaseInput v-model="tempRange" label="Temp range" placeholder="2C-8C" />
        <BaseInput v-model="securityLevel" label="Security" placeholder="standard" />
      </div>

      <p
        v-if="loadIdStandard"
        class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        Shipper load ID standard: {{ loadIdStandard }}
      </p>

      <p
        v-if="!onChainReady.isReady.value"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
      >
        {{ onChainReady.readinessMessage.value }}
      </p>

      <p
        v-if="error"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200"
      >
        {{ error }}
      </p>

      <div class="flex gap-2 pt-1">
        <BaseButton type="button" variant="secondary" class="flex-1" @click="resetForm">Clear</BaseButton>
        <BaseButton type="submit" class="flex-1" :loading="loading" :disabled="!onChainReady.isReady.value">
          Publish transaction
        </BaseButton>
      </div>
    </form>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AppCard from "@/shared/components/ui/AppCard.vue";
import BaseButton from "@/shared/components/ui/BaseButton.vue";
import BaseInput from "@/shared/components/ui/BaseInput.vue";
import BaseSelect from "@/shared/components/ui/BaseSelect.vue";
import { TrxApiError, createOrder } from "@/services/trx/trxApi";
import { useOnChainWriteReadiness } from "@/shared/composables/useOnChainWriteReadiness";

const props = defineProps<{
  actorDid: string;
  loadIdStandard: string | null;
}>();

const emit = defineEmits<{
  created: [];
}>();

const shipmentId = ref("");
const cmrReference = ref("");
const processType = ref<"Tendering" | "Auction" | "Direct Book">("Tendering");
const loadType = ref<"FTL" | "LTL">("FTL");
const sponda = ref(false);
const adr = ref(false);
const tempRange = ref("");
const securityLevel = ref("");
const loading = ref(false);
const error = ref("");
const onChainReady = useOnChainWriteReadiness();

function resetForm(): void {
  shipmentId.value = "";
  cmrReference.value = "";
  processType.value = "Tendering";
  loadType.value = "FTL";
  sponda.value = false;
  adr.value = false;
  tempRange.value = "";
  securityLevel.value = "";
  error.value = "";
}

async function submitForm(): Promise<void> {
  if (!onChainReady.isReady.value) {
    error.value = onChainReady.readinessMessage.value;
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const reference = [shipmentId.value.trim(), cmrReference.value.trim()].filter(Boolean).join(" | ");

    await createOrder(props.actorDid, {
      reference,
      process_type: processType.value,
      load_type: loadType.value,
      equipment_requirements: {
        sponda: sponda.value,
        adr: adr.value,
        temp_range: tempRange.value,
        security_level: securityLevel.value,
      },
    });

    resetForm();
    emit("created");
  } catch (submitError) {
    if (submitError instanceof TrxApiError) {
      error.value = submitError.message;
    } else if (submitError instanceof Error) {
      error.value = submitError.message;
    } else {
      error.value = "Failed to create load";
    }
  } finally {
    loading.value = false;
  }
}
</script>
