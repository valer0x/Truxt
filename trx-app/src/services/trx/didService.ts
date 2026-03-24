import type { DIDProfile, Role } from "@/domain/types";
import { getProfileByDid, getProfileByWallet, saveProfile } from "@/services/trx/persistentStore";
import { sha256 } from "@/lib/hash";

async function generateDid(walletAddress: string): Promise<string> {
  const hash = await sha256(walletAddress.trim().toLowerCase());
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
