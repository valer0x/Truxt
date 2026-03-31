import { describe, it, expect } from "vitest";
import {
  canTransition,
  canActorPerformTransition,
  canActorCreate,
} from "@/domain/stateMachine";
import type { Actor, OrderState, OrderToken } from "@/domain/types";

function makeToken(overrides: Partial<OrderToken> = {}): OrderToken {
  return {
    order_id: "ORD-TEST0001",
    issuer_did: "did:iota:shipper1",
    carrier_did: null,
    state: "PENDING",
    payload_offledger: {
      from: "Rome",
      to: "Milan",
      pickup_date: "2025-01-15",
      pickup_window: "08:00-12:00",
      weight: 1000,
      reference: "REF-001",
      process_type: "Tendering",
      load_type: "FTL",
      equipment_requirements_hash: "abc123",
    },
    fingerprint: "fp_test",
    created_at: "2025-01-15T00:00:00.000Z",
    updated_at: "2025-01-15T00:00:00.000Z",
    last_network_proof: null,
    last_verified_at: null,
    ...overrides,
  };
}

describe("canTransition", () => {
  describe("allowed transitions", () => {
    it.each<[OrderState, OrderState]>([
      ["PENDING", "BOOKED"],
      ["PENDING", "CANCELLED"],
      ["PENDING", "EXPIRED"],
      ["BOOKED", "DONE"],
      ["BOOKED", "CANCELLED"],
    ])("%s → %s is allowed", (current, next) => {
      expect(canTransition(current, next)).toBe(true);
    });
  });

  describe("denied transitions", () => {
    it.each<[OrderState, OrderState]>([
      ["PENDING", "DONE"],
      ["DONE", "PENDING"],
      ["DONE", "BOOKED"],
      ["DONE", "CANCELLED"],
      ["DONE", "EXPIRED"],
      ["CANCELLED", "PENDING"],
      ["CANCELLED", "BOOKED"],
      ["CANCELLED", "DONE"],
      ["CANCELLED", "EXPIRED"],
      ["EXPIRED", "PENDING"],
      ["EXPIRED", "BOOKED"],
      ["EXPIRED", "DONE"],
      ["EXPIRED", "CANCELLED"],
      ["BOOKED", "PENDING"],
      ["BOOKED", "EXPIRED"],
    ])("%s → %s is denied", (current, next) => {
      expect(canTransition(current, next)).toBe(false);
    });
  });
});

describe("canActorPerformTransition", () => {
  describe("BOOKED transition", () => {
    it("allows CARRIER when token is PENDING and carrier_did is null", () => {
      const actor: Actor = { role: "CARRIER", did: "did:iota:carrier1" };
      const token = makeToken({ state: "PENDING", carrier_did: null });
      const result = canActorPerformTransition(actor, token, "BOOKED");
      expect(result).toEqual({ allowed: true });
    });

    it("denies SHIPPER", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper1" };
      const token = makeToken({ state: "PENDING", carrier_did: null });
      const result = canActorPerformTransition(actor, token, "BOOKED");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });

    it("denies if carrier_did is set to someone else", () => {
      const actor: Actor = { role: "CARRIER", did: "did:iota:carrier1" };
      const token = makeToken({
        state: "PENDING",
        carrier_did: "did:iota:carrier_other",
      });
      const result = canActorPerformTransition(actor, token, "BOOKED");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });
  });

  describe("DONE transition", () => {
    it("allows CARRIER if carrier_did matches actor.did", () => {
      const actor: Actor = { role: "CARRIER", did: "did:iota:carrier1" };
      const token = makeToken({
        state: "BOOKED",
        carrier_did: "did:iota:carrier1",
      });
      const result = canActorPerformTransition(actor, token, "DONE");
      expect(result).toEqual({ allowed: true });
    });

    it("denies CARRIER if carrier_did does not match", () => {
      const actor: Actor = { role: "CARRIER", did: "did:iota:carrier1" };
      const token = makeToken({
        state: "BOOKED",
        carrier_did: "did:iota:carrier_other",
      });
      const result = canActorPerformTransition(actor, token, "DONE");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });

    it("denies SHIPPER", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper1" };
      const token = makeToken({
        state: "BOOKED",
        carrier_did: "did:iota:carrier1",
      });
      const result = canActorPerformTransition(actor, token, "DONE");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });
  });

  describe("CANCELLED transition", () => {
    it("allows SHIPPER if issuer_did matches and state is PENDING", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper1" };
      const token = makeToken({
        state: "PENDING",
        issuer_did: "did:iota:shipper1",
      });
      const result = canActorPerformTransition(actor, token, "CANCELLED");
      expect(result).toEqual({ allowed: true });
    });

    it("denies CARRIER", () => {
      const actor: Actor = { role: "CARRIER", did: "did:iota:carrier1" };
      const token = makeToken({ state: "PENDING" });
      const result = canActorPerformTransition(actor, token, "CANCELLED");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });

    it("denies SHIPPER if issuer_did does not match", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper2" };
      const token = makeToken({
        state: "PENDING",
        issuer_did: "did:iota:shipper1",
      });
      const result = canActorPerformTransition(actor, token, "CANCELLED");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });

    // REQ-013 fix: BOOKED→CANCELLED is a valid lifecycle transition (WP Section IV).
    // The issuing SHIPPER may cancel from either PENDING or BOOKED state.
    it("allows SHIPPER to cancel a BOOKED load (issuer match)", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper1" };
      const token = makeToken({
        state: "BOOKED",
        issuer_did: "did:iota:shipper1",
        carrier_did: "did:iota:carrier1",
      });
      const result = canActorPerformTransition(actor, token, "CANCELLED");
      expect(result).toEqual({ allowed: true });
    });

    it("denies SHIPPER cancelling BOOKED load they did not issue", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper2" };
      const token = makeToken({
        state: "BOOKED",
        issuer_did: "did:iota:shipper1",
        carrier_did: "did:iota:carrier1",
      });
      const result = canActorPerformTransition(actor, token, "CANCELLED");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });
  });

  // REQ-013 fix: PENDING→EXPIRED is a valid lifecycle transition (WP Section IV).
  // Temporarily authorized to the issuing SHIPPER until an automated scheduler exists.
  describe("EXPIRED transition", () => {
    it("allows SHIPPER (issuer) to expire a PENDING load", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper1" };
      const token = makeToken({
        state: "PENDING",
        issuer_did: "did:iota:shipper1",
      });
      const result = canActorPerformTransition(actor, token, "EXPIRED");
      expect(result).toEqual({ allowed: true });
    });

    it("denies SHIPPER who is not the issuer", () => {
      const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper2" };
      const token = makeToken({
        state: "PENDING",
        issuer_did: "did:iota:shipper1",
      });
      const result = canActorPerformTransition(actor, token, "EXPIRED");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });

    it("denies CARRIER from triggering expiry", () => {
      const actor: Actor = { role: "CARRIER", did: "did:iota:carrier1" };
      const token = makeToken({ state: "PENDING", issuer_did: "did:iota:shipper1" });
      const result = canActorPerformTransition(actor, token, "EXPIRED");
      expect(result).toEqual({ allowed: false, reason: expect.any(String) });
    });
  });
});

describe("canActorCreate", () => {
  it("allows SHIPPER", () => {
    const actor: Actor = { role: "SHIPPER", did: "did:iota:shipper1" };
    expect(canActorCreate(actor)).toEqual({ allowed: true });
  });

  it("denies CARRIER with reason 'Only SHIPPER can create loads'", () => {
    const actor: Actor = { role: "CARRIER", did: "did:iota:carrier1" };
    const result = canActorCreate(actor);
    expect(result).toEqual({
      allowed: false,
      reason: "Only SHIPPER can create loads",
    });
  });
});
