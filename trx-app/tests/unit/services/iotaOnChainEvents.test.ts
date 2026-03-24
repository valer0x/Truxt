import { describe, it, expect } from "vitest";
import {
  parseOnChainNetworkEvent,
  stateCodeToOrderState,
  orderStateToStateCode,
  LOAD_CREATED_EVENT_NAME,
  LOAD_STATE_CHANGED_EVENT_NAME,
} from "@/services/trx/iotaOnChainEvents";

const scope = { packageId: "0xpkg123", moduleName: "load_registry" };

function makeCreatedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: { txDigest: "tx_abc123", eventSeq: "0" },
    type: `${scope.packageId}::${scope.moduleName}::${LOAD_CREATED_EVENT_NAME}`,
    parsedJson: {
      order_id: "ORD-TEST0001",
      fingerprint: "fp_test",
      state: 0,
      issuer_did: "did:iota:shipper1",
      carrier_did: "",
      from: "Rome",
      to: "Milan",
      pickup_date: "2025-01-15",
      pickup_window: "08:00-12:00",
      weight: 1000,
      reference: "REF-001",
      process_type: "Tendering",
      load_type: "FTL",
      equipment_requirements_hash: "hash123",
      load_object_id: "0xobj001",
      ...overrides,
    },
    timestampMs: "1705276800000",
  } as any;
}

function makeStateChangedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: { txDigest: "tx_state456", eventSeq: "1" },
    type: `${scope.packageId}::${scope.moduleName}::${LOAD_STATE_CHANGED_EVENT_NAME}`,
    parsedJson: {
      order_id: "ORD-TEST0001",
      new_state: 1,
      previous_state: 0,
      issuer_did: "did:iota:shipper1",
      carrier_did: "did:iota:carrier1",
      ...overrides,
    },
    timestampMs: "1705276900000",
  } as any;
}

describe("stateCodeToOrderState", () => {
  it.each([
    [0, "PENDING"],
    [1, "BOOKED"],
    [2, "DONE"],
    [3, "CANCELLED"],
    [4, "EXPIRED"],
    [99, null],
  ] as const)("maps %d → %s", (code, expected) => {
    expect(stateCodeToOrderState(code)).toBe(expected);
  });
});

describe("orderStateToStateCode", () => {
  it.each([
    ["PENDING", 0],
    ["BOOKED", 1],
    ["DONE", 2],
    ["CANCELLED", 3],
    ["EXPIRED", 4],
  ] as const)("maps %s → %d", (state, expected) => {
    expect(orderStateToStateCode(state)).toBe(expected);
  });
});

describe("parseOnChainNetworkEvent", () => {
  it("returns null for events with wrong type (not matching scope)", () => {
    const event = makeCreatedEvent();
    event.type = "0xother::other_module::OtherEvent";
    expect(parseOnChainNetworkEvent(event, scope)).toBeNull();
  });

  it("returns null for events without parsedJson", () => {
    const event = makeCreatedEvent();
    event.parsedJson = null;
    expect(parseOnChainNetworkEvent(event, scope)).toBeNull();
  });

  it("returns null for events missing order_id", () => {
    const event = makeCreatedEvent();
    delete (event.parsedJson as any).order_id;
    expect(parseOnChainNetworkEvent(event, scope)).toBeNull();
  });

  it("returns null for events missing state", () => {
    const event = makeCreatedEvent();
    delete (event.parsedJson as any).state;
    expect(parseOnChainNetworkEvent(event, scope)).toBeNull();
  });

  it("returns null for events missing txDigest", () => {
    const event = makeCreatedEvent();
    event.id = { txDigest: "", eventSeq: "0" };
    (event.parsedJson as any).tx_id = undefined;
    expect(parseOnChainNetworkEvent(event, scope)).toBeNull();
  });

  it("parses LoadCreatedEvent correctly", () => {
    const result = parseOnChainNetworkEvent(makeCreatedEvent(), scope);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("LOAD_CREATED");
    expect(result!.order_id).toBe("ORD-TEST0001");
    expect(result!.state).toBe("PENDING");
    expect(result!.issuer_did).toBe("did:iota:shipper1");
    expect(result!.carrier_did).toBeNull();
    expect(result!.tx_id).toBe("tx_abc123");
    expect(result!.loadObjectId).toBe("0xobj001");
    expect(result!.fingerprint).toBe("fp_test");
    expect(result!.previousState).toBeNull();
    expect(result!.payload).toEqual({
      from: "Rome",
      to: "Milan",
      pickup_date: "2025-01-15",
      pickup_window: "08:00-12:00",
      weight: 1000,
      reference: "REF-001",
      process_type: "Tendering",
      load_type: "FTL",
      equipment_requirements_hash: "hash123",
    });
  });

  it("parses LoadStateChangedEvent correctly", () => {
    const result = parseOnChainNetworkEvent(makeStateChangedEvent(), scope);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("LOAD_STATE_CHANGED");
    expect(result!.order_id).toBe("ORD-TEST0001");
    expect(result!.state).toBe("BOOKED");
    expect(result!.previousState).toBe("PENDING");
    expect(result!.payload).toBeNull();
  });

  it("handles numeric state as string", () => {
    const result = parseOnChainNetworkEvent(makeStateChangedEvent({ new_state: "1" }), scope);
    expect(result).not.toBeNull();
    expect(result!.state).toBe("BOOKED");
  });

  it("handles carrier_did in {Some: value} format", () => {
    const result = parseOnChainNetworkEvent(
      makeCreatedEvent({ carrier_did: { Some: "did:iota:carrier_wrapped" } }),
      scope,
    );
    expect(result).not.toBeNull();
    expect(result!.carrier_did).toBe("did:iota:carrier_wrapped");
  });

  it("handles carrier_did as array", () => {
    const result = parseOnChainNetworkEvent(
      makeCreatedEvent({ carrier_did: ["did:iota:carrier_arr"] }),
      scope,
    );
    expect(result).not.toBeNull();
    expect(result!.carrier_did).toBe("did:iota:carrier_arr");
  });

  it("handles carrier_did as direct string", () => {
    const result = parseOnChainNetworkEvent(
      makeCreatedEvent({ carrier_did: "did:iota:carrier_direct" }),
      scope,
    );
    expect(result).not.toBeNull();
    expect(result!.carrier_did).toBe("did:iota:carrier_direct");
  });

  it("handles loadObjectId from parsedJson", () => {
    const result = parseOnChainNetworkEvent(makeCreatedEvent({ load_object_id: "0xobj999" }), scope);
    expect(result).not.toBeNull();
    expect(result!.loadObjectId).toBe("0xobj999");
  });
});
