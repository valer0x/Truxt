import { describe, it, expect, beforeEach } from "vitest";
import type { DIDProfile } from "@/domain/types";
import {
  resetTrxStore,
  saveProfile,
  getProfileByWallet,
  getProfileByDid,
} from "@/services/trx/persistentStore";

function makeProfile(overrides: Partial<DIDProfile> = {}): DIDProfile {
  return {
    wallet_address: "0xabc123",
    did: "did:iota:test123",
    role: "SHIPPER",
    company_name: "Test Corp",
    country: "Italy",
    city: "Rome",
    legal_id_hash: "hash_legal",
    load_id_standard: null,
    ...overrides,
  };
}

describe("persistentStore", () => {
  beforeEach(() => {
    resetTrxStore();
    window.localStorage.clear();
  });

  it("initially returns null for getProfileByWallet", () => {
    expect(getProfileByWallet("0xnonexistent")).toBeNull();
  });

  it("returns profile by wallet after saveProfile", () => {
    const profile = makeProfile();
    saveProfile(profile);
    expect(getProfileByWallet(profile.wallet_address)).toEqual(profile);
  });

  it("returns profile by DID after saveProfile", () => {
    const profile = makeProfile();
    saveProfile(profile);
    expect(getProfileByDid(profile.did)).toEqual(profile);
  });

  it("overwrites when saving profile with same wallet_address (upsert)", () => {
    saveProfile(makeProfile({ company_name: "Old Corp" }));
    saveProfile(makeProfile({ company_name: "New Corp" }));

    const result = getProfileByWallet("0xabc123");
    expect(result).not.toBeNull();
    expect(result!.company_name).toBe("New Corp");
  });

  it("overwrites when saving profile with same did (upsert)", () => {
    saveProfile(makeProfile({ wallet_address: "0xfirst", company_name: "Old Corp" }));
    saveProfile(makeProfile({ wallet_address: "0xsecond", company_name: "New Corp" }));

    const result = getProfileByDid("did:iota:test123");
    expect(result).not.toBeNull();
    expect(result!.company_name).toBe("New Corp");
  });

  it("clears all profiles on resetTrxStore", () => {
    saveProfile(makeProfile());
    saveProfile(makeProfile({ wallet_address: "0xother", did: "did:iota:other" }));
    resetTrxStore();

    expect(getProfileByWallet("0xabc123")).toBeNull();
    expect(getProfileByWallet("0xother")).toBeNull();
  });

  it("allows multiple profiles to coexist", () => {
    const profileA = makeProfile({ wallet_address: "0xA", did: "did:iota:A", company_name: "A Corp" });
    const profileB = makeProfile({ wallet_address: "0xB", did: "did:iota:B", company_name: "B Corp" });

    saveProfile(profileA);
    saveProfile(profileB);

    expect(getProfileByWallet("0xA")).toEqual(profileA);
    expect(getProfileByWallet("0xB")).toEqual(profileB);
    expect(getProfileByDid("did:iota:A")).toEqual(profileA);
    expect(getProfileByDid("did:iota:B")).toEqual(profileB);
  });

  it("persists data to localStorage", () => {
    saveProfile(makeProfile());
    expect(window.localStorage.getItem("trx_database_v1")).not.toBeNull();
  });
});
