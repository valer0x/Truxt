<template>
  <button type="button" class="text-xs font-semibold text-trx-700 underline decoration-dotted hover:text-trx-900 dark:text-trx-300 dark:hover:text-trx-100" @click="isOpen = true">
    View Proof
  </button>
  <ModalShell :open="isOpen" title="Network Proof" @close="isOpen = false">
    <dl class="space-y-2 text-xs sm:text-sm">
      <div>
        <dt class="text-slate-500 dark:text-slate-400">TX ID</dt>
        <dd class="break-all font-mono text-slate-800 dark:text-slate-100">{{ proof.tx_id }}</dd>
      </div>
      <div>
        <dt class="text-slate-500 dark:text-slate-400">Block ID</dt>
        <dd class="break-all font-mono text-slate-800 dark:text-slate-100">{{ proof.block_id }}</dd>
      </div>
      <div>
        <dt class="text-slate-500 dark:text-slate-400">Timestamp</dt>
        <dd class="text-slate-800 dark:text-slate-100">{{ proof.timestamp }}</dd>
      </div>
      <div>
        <dt class="text-slate-500 dark:text-slate-400">State</dt>
        <dd class="text-slate-800 dark:text-slate-100">{{ proof.state }}</dd>
      </div>
      <div>
        <dt class="text-slate-500 dark:text-slate-400">Issuer DID</dt>
        <dd class="break-all font-mono text-slate-800 dark:text-slate-100">{{ proof.issuer_did }}</dd>
      </div>
      <div v-if="proof.carrier_did">
        <dt class="text-slate-500 dark:text-slate-400">Carrier DID</dt>
        <dd class="break-all font-mono text-slate-800 dark:text-slate-100">{{ proof.carrier_did }}</dd>
      </div>
      <div>
        <dt class="text-slate-500 dark:text-slate-400">Verified</dt>
        <dd :class="proof.verified ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'">
          {{ proof.verified ? 'Yes' : 'No' }}
        </dd>
      </div>
    </dl>
  </ModalShell>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { NetworkProof } from "@/domain/types";
import ModalShell from "@/shared/components/ui/ModalShell.vue";

defineProps<{ proof: NetworkProof }>();

const isOpen = ref(false);
</script>
