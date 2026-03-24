import { describe, it, expect, vi, beforeEach } from "vitest";
import { nextTick } from "vue";
import type { NetworkEventPayload } from "@/domain/types";

let capturedHandler: ((event: NetworkEventPayload) => void) | null = null;
const mockUnsubscribe = vi.fn();

vi.mock("@/services/trx/networkEvents", () => ({
  subscribeNetworkEvents: vi.fn((handler: (event: NetworkEventPayload) => void) => {
    capturedHandler = handler;
    return mockUnsubscribe;
  }),
}));

import { useLiveOrderSync } from "@/shared/composables/useLiveOrderSync";
import { subscribeNetworkEvents } from "@/services/trx/networkEvents";

function makeEvent(overrides: Partial<NetworkEventPayload> = {}): NetworkEventPayload {
  return {
    event_id: "evt_001",
    type: "LOAD_CREATED",
    order_id: "ORD-TEST0001",
    tx_id: "tx_001",
    state: "PENDING",
    issuer_did: "did:iota:shipper1",
    carrier_did: null,
    timestamp: "2025-01-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("useLiveOrderSync", () => {
  beforeEach(() => {
    capturedHandler = null;
    mockUnsubscribe.mockClear();
    vi.mocked(subscribeNetworkEvents).mockClear();
  });

  it("start() subscribes to network events", () => {
    const { start } = useLiveOrderSync(vi.fn());
    start();
    expect(subscribeNetworkEvents).toHaveBeenCalledOnce();
  });

  it("calling start() twice does not double-subscribe", () => {
    const { start } = useLiveOrderSync(vi.fn());
    start();
    start();
    expect(subscribeNetworkEvents).toHaveBeenCalledOnce();
  });

  it("stop() calls unsubscribe", () => {
    const { start, stop } = useLiveOrderSync(vi.fn());
    start();
    stop();
    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });

  it("receiving an event calls onEvent handler", async () => {
    const onEvent = vi.fn();
    const { start } = useLiveOrderSync(onEvent);
    start();
    const event = makeEvent();
    capturedHandler!(event);
    await nextTick();
    expect(onEvent).toHaveBeenCalledWith(event);
  });

  it("receiving same event_id twice only calls onEvent once (de-dupe)", async () => {
    const onEvent = vi.fn();
    const { start } = useLiveOrderSync(onEvent);
    start();
    const event = makeEvent({ event_id: "evt_dup" });
    capturedHandler!(event);
    await nextTick();
    capturedHandler!(event);
    await nextTick();
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it("syncing is true while onEvent is processing, false after", async () => {
    let resolve: () => void;
    const gate = new Promise<void>((r) => {
      resolve = r;
    });
    const onEvent = vi.fn(() => gate);
    const { start, syncing } = useLiveOrderSync(onEvent);
    start();
    capturedHandler!(makeEvent({ event_id: "evt_sync" }));
    await nextTick();
    expect(syncing.value).toBe(true);
    resolve!();
    await gate;
    await nextTick();
    expect(syncing.value).toBe(false);
  });

  it("lastEvent ref updates with received event", async () => {
    const { start, lastEvent } = useLiveOrderSync(vi.fn());
    start();
    expect(lastEvent.value).toBeNull();
    const event = makeEvent({ event_id: "evt_last" });
    capturedHandler!(event);
    await nextTick();
    expect(lastEvent.value).toEqual(event);
  });
});
