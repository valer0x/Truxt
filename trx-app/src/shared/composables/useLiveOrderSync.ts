import { ref } from "vue";
import type { NetworkEventPayload } from "@/domain/types";
import { subscribeNetworkEvents } from "@/services/trx/networkEvents";

export function useLiveOrderSync(
  onEvent: (event: NetworkEventPayload) => Promise<void> | void
): {
  syncing: ReturnType<typeof ref<boolean>>;
  lastEvent: ReturnType<typeof ref<NetworkEventPayload | null>>;
  start: () => void;
  stop: () => void;
} {
  const syncing = ref(false);
  const lastEvent = ref<NetworkEventPayload | null>(null);
  let unsubscribe: (() => void) | null = null;

  async function handleEvent(event: NetworkEventPayload): Promise<void> {
    if (lastEvent.value?.event_id === event.event_id) {
      return;
    }

    lastEvent.value = event;
    syncing.value = true;
    try {
      await onEvent(event);
    } finally {
      syncing.value = false;
    }
  }

  function start(): void {
    if (unsubscribe) {
      return;
    }

    unsubscribe = subscribeNetworkEvents((event) => {
      void handleEvent(event);
    });
  }

  function stop(): void {
    unsubscribe?.();
    unsubscribe = null;
  }

  return {
    syncing,
    lastEvent,
    start,
    stop,
  };
}
