/**
 * DID SERVICE — APPLICATION-LEVEL IMPLEMENTATION
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  WARNING: This module does NOT use the IOTA Identity SDK.           │
 * │                                                                     │
 * │  DIDs generated here are application-level identifiers derived      │
 * │  from wallet addresses via SHA-256 hashing. They are NOT:           │
 * │    - Published as IOTA Identity DID documents on the Tangle         │
 * │    - Resolvable by external DID resolvers                           │
 * │    - Backed by Alias Objects or any IOTA Identity infrastructure    │
 * │    - Compliant with the IOTA Identity DID method specification      │
 * │                                                                     │
 * │  FUTURE INTEGRATION POINT (REQ-006):                                │
 * │    Replace generateDid() with the @iota/identity-wasm SDK to        │
 * │    produce proper, Tangle-anchored, resolvable IOTA Identity DIDs.  │
 * │    See: https://wiki.iota.org/identity.rs/getting-started           │
 * │                                                                     │
 * │  Current DID format: did:iota:<first-32-chars-of-sha256(address)>   │
 * │  This format is application-specific and not externally portable.   │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import type { DIDProfile, Role } from "@/domain/types";
import { getProfileByDid, getProfileByWallet, saveProfile } from "@/services/trx/persistentStore";
import { sha256 } from "@/lib/hash";

/**
 * Generates an application-level DID from a wallet address.
 *
 * TEMPORARY IMPLEMENTATION — not IOTA Identity SDK compliant.
 * The DID is deterministic but is not anchored on the Tangle and is not
 * independently resolvable without access to this application's local
 * profile store.
 */
async function generateDid(walletAddress: string): Promise<string> {
  const hash = await sha256(walletAddress.trim().toLowerCase());
  // Truncate to 32 hex chars: application-level shorthand, not an IOTA Identity standard.
  return `did:iota:${hash.slice(0, 32)}`;
}

async function hashLegalId(legalId: string): Promise<string> {
  return sha256(legalId.trim());
}

export function lookupByWallet(walletAddress: string): DIDProfile | null {
  return getProfileByWallet(walletAddress);
}

export function lookupByDid(did: string): DIDProfile | null {
  return getProfileByDid(did);
}

export async function registerProfile(data: {
  wallet_address: string;
  role: Role;
  company_name: string;
  country: string;
  city: string;
  legal_id: string;
  load_id_standard?: string | null;
}): Promise<DIDProfile> {
  const existing = getProfileByWallet(data.wallet_address);
  if (existing) {
    throw new Error("Wallet already registered");
  }

  const profile: DIDProfile = {
    wallet_address: data.wallet_address,
    did: await generateDid(data.wallet_address),
    role: data.role,
    company_name: data.company_name,
    country: data.country,
    city: data.city,
    legal_id_hash: await hashLegalId(data.legal_id),
    load_id_standard: data.load_id_standard ?? null,
  };

  saveProfile(profile);
  return profile;
}
