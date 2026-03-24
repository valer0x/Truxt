import { IotaClient, type EventId } from "@iota/iota-sdk/client";
import type { NetworkEventPayload } from "@/domain/types";
import { getIotaOnChainConfig } from "@/services/trx/iotaOnChainConfig";
import { parseOnChainNetworkEvent } from "@/services/trx/iotaOnChainEvents";

const CHANNEL_NAME = "trx-network-events";
const WINDOW_EVENT_NAME = "trx:network-event";
const MAX_TRACKED_EVENT_IDS = 600;

let sharedChannel: BroadcastChannel | null = null;
let subscriberCount = 0;

const seenEventIds = new Set<string>();
const seenEventQueue: string[] = [];

let pollingClient: IotaClient | null = null;
let pollingClientUrl = "";
let onChainPollingActive = false;
let onChainPollTimer: ReturnType<typeof setTimeout> | null = null;
let onChainCursor: EventId | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (!sharedChannel) {
    sharedChannel = new BroadcastChannel(CHANNEL_NAME);
  }

  return sharedChannel;
}

function rememberEvent(eventId: string): boolean {
  if (!eventId) {
    return true;
  }

  if (seenEventIds.has(eventId)) {
    return false;
  }

  seenEventIds.add(eventId);
  seenEventQueue.push(eventId);

  if (seenEventQueue.length > MAX_TRACKED_EVENT_IDS) {
    const oldest = seenEventQueue.shift();
    if (oldest) {
      seenEventIds.delete(oldest);
    }
  }

  return true;
}

function getPollingClient(url: string): IotaClient {
  if (!pollingClient || pollingClientUrl !== url) {
    pollingClient = new IotaClient({ url });
    pollingClientUrl = url;
  }

  return pollingClient;
}

function clearPollTimer(): void {
  if (onChainPollTimer !== null) {
    clearTimeout(onChainPollTimer);
    onChainPollTimer = null;
  }
}

function scheduleNextPoll(delayMs: number): void {
  if (!onChainPollingActive) {
    return;
  }

  clearPollTimer();
  onChainPollTimer = setTimeout(() => {
    void pollOnChainEvents();
  }, delayMs);
}

async function bootstrapCursor(): Promise<void> {
  const config = getIotaOnChainConfig();
  if (!config.enabled || !config.packageId) {
    onChainCursor = null;
    return;
  }

  const page = await getPollingClient(config.fullnodeUrl).queryEvents({
    query: {
      MoveModule: {
        package: config.packageId,
        module: config.moduleName,
      },
    },
    limit: 1,
    order: "descending",
  });

  onChainCursor = page.data[0]?.id ?? null;
}

async function pollOnChainEvents(): Promise<void> {
  if (!onChainPollingActive) {
    return;
  }

  const config = getIotaOnChainConfig();
  if (!config.enabled || !config.packageId) {
    scheduleNextPoll(3_000);
    return;
  }

  const client = getPollingClient(config.fullnodeUrl);

  try {
    let continuePaging = true;

    while (continuePaging && onChainPollingActive) {
      const page = await client.queryEvents({
        query: {
          MoveModule: {
            package: config.packageId,
            module: config.moduleName,
          },
        },
        cursor: onChainCursor,
        limit: 50,
        order: "ascending",
      });

      for (const event of page.data) {
        const parsed = parseOnChainNetworkEvent(event, {
          packageId: config.packageId,
          moduleName: config.moduleName,
        });

        if (parsed) {
          publishNetworkEvent(parsed);
        }
      }

      if (page.data.length > 0) {
        onChainCursor = page.data[page.data.length - 1].id;
      } else if (page.nextCursor) {
        onChainCursor = page.nextCursor;
      }

      continuePaging = Boolean(page.hasNextPage && page.nextCursor);
      if (continuePaging) {
        onChainCursor = page.nextCursor ?? null;
      }
    }

    scheduleNextPoll(config.pollIntervalMs);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[iota-events] polling failed", error);
    }

    scheduleNextPoll(4_000);
  }
}

async function startOnChainPolling(): Promise<void> {
  if (onChainPollingActive) {
    return;
  }

  const config = getIotaOnChainConfig();
  if (!config.enabled || !config.packageId) {
    return;
  }

  onChainPollingActive = true;

  try {
    await bootstrapCursor();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[iota-events] bootstrap failed", error);
    }
  }

  scheduleNextPoll(200);
}

function stopOnChainPolling(): void {
  onChainPollingActive = false;
  clearPollTimer();
}

export function publishNetworkEvent(payload: NetworkEventPayload): void {
  if (!rememberEvent(payload.event_id)) {
    return;
  }

  const channel = getChannel();
  channel?.postMessage(payload);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<NetworkEventPayload>(WINDOW_EVENT_NAME, {
        detail: payload,
      })
    );
  }
}

export function subscribeNetworkEvents(handler: (payload: NetworkEventPayload) => void): () => void {
  subscriberCount += 1;

  const channel = getChannel();

  const broadcastListener = (event: MessageEvent<NetworkEventPayload>) => {
    if (event.data) {
      handler(event.data);
    }
  };

  const windowListener = (event: Event) => {
    const customEvent = event as CustomEvent<NetworkEventPayload>;
    if (customEvent.detail) {
      handler(customEvent.detail);
    }
  };

  channel?.addEventListener("message", broadcastListener);

  if (typeof window !== "undefined") {
    window.addEventListener(WINDOW_EVENT_NAME, windowListener);
  }

  if (subscriberCount === 1) {
    void startOnChainPolling();
  }

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);

    channel?.removeEventListener("message", broadcastListener);

    if (typeof window !== "undefined") {
      window.removeEventListener(WINDOW_EVENT_NAME, windowListener);
    }

    if (subscriberCount === 0) {
      stopOnChainPolling();
    }
  };
}
