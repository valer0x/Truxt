<template>
  <AppCard class="space-y-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-display text-lg text-slate-900 dark:text-slate-50">Create New Load Transaction</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">
          Anchors a minimal load token on-chain: order ID, fingerprint, state, and actor DID only.
        </p>
      </div>
      <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
        On-chain
      </span>
    </div>

    <form class="space-y-3" @submit.prevent="submitForm">
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
        <BaseButton type="button" variant="secondary" class="flex-1" @click="$emit('created')">Cancel</BaseButton>
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
import { TrxApiError, createOrder } from "@/services/trx/trxApi";
import { useOnChainWriteReadiness } from "@/shared/composables/useOnChainWriteReadiness";

const props = defineProps<{
  actorDid: string;
  loadIdStandard: string | null;
}>();

const emit = defineEmits<{
  created: [];
}>();

const loading = ref(false);
const error = ref("");
const onChainReady = useOnChainWriteReadiness();

async function submitForm(): Promise<void> {
  if (!onChainReady.isReady.value) {
    error.value = onChainReady.readinessMessage.value;
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await createOrder(props.actorDid, {});
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
