import { describe, it, expect, beforeEach } from "vitest";
import { registerProfile, lookupByWallet, lookupByDid } from "@/services/trx/didService";
import { resetTrxStore } from "@/services/trx/persistentStore";

function registrationData(overrides: Record<string, unknown> = {}) {
  return {
    wallet_address: "0xabc123",
    role: "SHIPPER" as const,
    company_name: "Test Corp",
    country: "Italy",
    city: "Rome",
    legal_id: "IT12345678901",
    load_id_standard: null,
    ...overrides,
  };
}

describe("didService", () => {
  beforeEach(() => {
    resetTrxStore();
    window.localStorage.clear();
  });

  it("generates DID in format did:iota: + 32 hex chars", async () => {
    const profile = await registerProfile(registrationData());
    expect(profile.did).toMatch(/^did:iota:[0-9a-f]{32}$/);
  });

  it("hashes legal_id (never stored in plaintext)", async () => {
    const data = registrationData({ legal_id: "IT12345678901" });
    const profile = await registerProfile(data);
    expect(profile.legal_id_hash).not.toBe("IT12345678901");
    expect(profile.legal_id_hash.length).toBeGreaterThan(0);
  });

  it("lookupByWallet returns profile after registration", async () => {
    const profile = await registerProfile(registrationData());
    const found = lookupByWallet(profile.wallet_address);
    expect(found).toEqual(profile);
  });

  it("lookupByDid returns profile after registration", async () => {
    const profile = await registerProfile(registrationData());
    const found = lookupByDid(profile.did);
    expect(found).toEqual(profile);
  });

  it("throws on duplicate wallet registration", async () => {
    await registerProfile(registrationData());
    await expect(registerProfile(registrationData())).rejects.toThrow("Wallet already registered");
  });

  it("different wallets produce different DIDs", async () => {
    const profileA = await registerProfile(registrationData({ wallet_address: "0xAAA" }));
    const profileB = await registerProfile(registrationData({ wallet_address: "0xBBB" }));
    expect(profileA.did).not.toBe(profileB.did);
  });

  it("same wallet always produces same DID (deterministic)", async () => {
    const profileFirst = await registerProfile(registrationData({ wallet_address: "0xDET" }));
    const didFirst = profileFirst.did;

    resetTrxStore();

    const profileSecond = await registerProfile(registrationData({ wallet_address: "0xDET" }));
    expect(profileSecond.did).toBe(didFirst);
  });
});
