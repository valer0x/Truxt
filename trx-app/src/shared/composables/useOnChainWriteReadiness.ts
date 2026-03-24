import { computed, onMounted, onUnmounted, ref, watch, type ComputedRef, type Ref } from "vue";
import { getOnChainWriteReadiness, type OnChainWriteReadiness } from "@/services/trx/iotaOnChainConfig";
import { useIotaWallet } from "@/shared/composables/useIotaWallet";

const POLL_INTERVAL_MS = 1_500;

export interface UseOnChainWriteReadiness {
  readiness: Ref<OnChainWriteReadiness>;
  readinessMessage: ComputedRef<string>;
  isReady: ComputedRef<boolean>;
  refresh: () => void;
}

export function useOnChainWriteReadiness(): UseOnChainWriteReadiness {
  const wallet = useIotaWallet();
  const readiness = ref<OnChainWriteReadiness>(getOnChainWriteReadiness());
  let timer: ReturnType<typeof setInterval> | null = null;

  function refresh(): void {
    readiness.value = getOnChainWriteReadiness();
  }

  watch(
    () => [wallet.isAvailable.value, wallet.address.value, wallet.debug.value.supportsSignAndExecute],
    () => {
      refresh();
    }
  );

  onMounted(() => {
    void wallet.refresh();
    refresh();
    timer = setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  });

  return {
    readiness,
    readinessMessage: computed(() => readiness.value.message),
    isReady: computed(() => readiness.value.ready),
    refresh,
  };
}
