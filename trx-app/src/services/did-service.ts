// ── DID Service ──
// Maps wallet addresses to DIDs and manages DID profiles.

import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { DIDProfile, Role } from "@/domain/types";
import { getProfileByWallet, getProfileByDid, saveProfile } from "@/lib/store";

/**
 * Generate a deterministic DID from a wallet address.
 * In production, this would use IOTA Identity to create a DID document.
 */
function generateDid(walletAddress: string): string {
  const hash = createHash("sha256")
    .update(walletAddress)
    .digest("hex")
    .slice(0, 32);
  return `did:iota:${hash}`;
}

/**
 * Hash a legal ID for privacy.
 */
function hashLegalId(legalId: string): string {
  return createHash("sha256").update(legalId).digest("hex");
}

/**
 * Look up a profile by wallet address. Returns null if not registered.
 */
export function lookupByWallet(walletAddress: string): DIDProfile | null {
  return getProfileByWallet(walletAddress);
}

/**
 * Look up a profile by DID.
 */
export function lookupByDid(did: string): DIDProfile | null {
  return getProfileByDid(did);
}

/**
 * Register a new DID profile from onboarding data.
 */
export function registerProfile(data: {
  wallet_address: string;
  role: Role;
  company_name: string;
  country: string;
  legal_id: string;
  load_id_standard?: string | null;
}): DIDProfile {
  const existing = getProfileByWallet(data.wallet_address);
  if (existing) {
    throw new Error("Wallet already registered");
  }

  const profile: DIDProfile = {
    wallet_address: data.wallet_address,
    did: generateDid(data.wallet_address),
    role: data.role,
    company_name: data.company_name,
    country: data.country,
    legal_id_hash: hashLegalId(data.legal_id),
    load_id_standard: data.load_id_standard ?? null,
  };

  saveProfile(profile);
  return profile;
}
