import { describe, it, expect, beforeEach } from "vitest";
import { saveLoadPayload, getLoadPayload, removeLoadPayload } from "@/services/trx/loadPayloadStore";
import type { OrderPayload } from "@/domain/types";

const samplePayload: OrderPayload = {
  from: "Milan",
  to: "Rome",
  pickup_date: "2025-03-01",
  pickup_window: "08:00-12:00",
  weight: 1500,
  reference: "REF-TEST-001",
  process_type: "Tendering",
  load_type: "FTL",
  equipment_requirements_hash: "abc123def456",
};

beforeEach(() => {
  localStorage.clear();
});

describe("saveLoadPayload / getLoadPayload", () => {
  it("round-trips a payload through localStorage", () => {
    saveLoadPayload("ORD-001", samplePayload);
    const result = getLoadPayload("ORD-001");
    expect(result).toEqual(samplePayload);
  });

  it("returns null for an order that was never saved", () => {
    expect(getLoadPayload("ORD-nonexistent")).toBeNull();
  });

  it("uses a namespaced key (does not collide with bare keys)", () => {
    // Verify the key written is prefixed, not just the raw orderId
    saveLoadPayload("ORD-001", samplePayload);
    expect(localStorage.getItem("ORD-001")).toBeNull();
    expect(localStorage.getItem("trx:payload:ORD-001")).not.toBeNull();
  });

  it("overwrites an existing entry on second save", () => {
    saveLoadPayload("ORD-001", samplePayload);
    const updated: OrderPayload = { ...samplePayload, weight: 9999 };
    saveLoadPayload("ORD-001", updated);
    expect(getLoadPayload("ORD-001")).toEqual(updated);
  });

  it("stores payloads independently per order_id", () => {
    const payloadA: OrderPayload = { ...samplePayload, from: "A-City" };
    const payloadB: OrderPayload = { ...samplePayload, from: "B-City" };
    saveLoadPayload("ORD-A", payloadA);
    saveLoadPayload("ORD-B", payloadB);
    expect(getLoadPayload("ORD-A")?.from).toBe("A-City");
    expect(getLoadPayload("ORD-B")?.from).toBe("B-City");
  });
});

describe("removeLoadPayload", () => {
  it("removes an existing entry", () => {
    saveLoadPayload("ORD-001", samplePayload);
    removeLoadPayload("ORD-001");
    expect(getLoadPayload("ORD-001")).toBeNull();
  });

  it("does not throw when removing a non-existent entry", () => {
    expect(() => removeLoadPayload("ORD-nonexistent")).not.toThrow();
  });
});

describe("REQ-027 separation contract", () => {
  it("getLoadPayload returns null before any save (off-chain fallback scenario)", () => {
    // On a different device, no payload exists in localStorage.
    // The read model must degrade gracefully to fallback values ("-").
    expect(getLoadPayload("ORD-foreign-device")).toBeNull();
  });
});
