import { describe, it, expect } from "vitest";
import { sha256, computeFingerprint } from "@/lib/hash";
import type { OrderPayload } from "@/domain/types";

function makePayload(overrides: Partial<OrderPayload> = {}): OrderPayload {
  return {
    from: "Rome",
    to: "Milan",
    pickup_date: "2025-01-15",
    pickup_window: "08:00-12:00",
    weight: 1000,
    reference: "REF-001",
    process_type: "Tendering",
    load_type: "FTL",
    equipment_requirements_hash: "abc123",
    ...overrides,
  };
}

describe("sha256", () => {
  it('produces known hash for "abc"', async () => {
    const hash = await sha256("abc");
    expect(hash).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("produces known hash for empty string", async () => {
    const hash = await sha256("");
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });
});

describe("computeFingerprint", () => {
  it("produces stable output for the same input", async () => {
    const payload = makePayload();
    const issuerDid = "did:iota:shipper1";
    const fp1 = await computeFingerprint(payload, issuerDid);
    const fp2 = await computeFingerprint(payload, issuerDid);
    expect(fp1).toBe(fp2);
  });

  it("changes when issuerDid changes", async () => {
    const payload = makePayload();
    const fp1 = await computeFingerprint(payload, "did:iota:shipper1");
    const fp2 = await computeFingerprint(payload, "did:iota:shipper2");
    expect(fp1).not.toBe(fp2);
  });

  it("changes when payload.from changes", async () => {
    const issuerDid = "did:iota:shipper1";
    const fp1 = await computeFingerprint(makePayload({ from: "Rome" }), issuerDid);
    const fp2 = await computeFingerprint(makePayload({ from: "Naples" }), issuerDid);
    expect(fp1).not.toBe(fp2);
  });

  it("does NOT change when pickup_window changes", async () => {
    const issuerDid = "did:iota:shipper1";
    const fp1 = await computeFingerprint(
      makePayload({ pickup_window: "08:00-12:00" }),
      issuerDid
    );
    const fp2 = await computeFingerprint(
      makePayload({ pickup_window: "14:00-18:00" }),
      issuerDid
    );
    expect(fp1).toBe(fp2);
  });
});
