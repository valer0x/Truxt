import type { DIDProfile } from "@/domain/types";

const STORAGE_KEY = "trx_database_v1";

interface StoreData {
  profiles: DIDProfile[];
}

const memoryStore: StoreData = {
  profiles: [],
};

function cloneStore(data: StoreData): StoreData {
  return {
    profiles: data.profiles.map((profile) => ({ ...profile })),
  };
}

function fallbackStore(): StoreData {
  return cloneStore(memoryStore);
}

function readStore(): StoreData {
  if (typeof window === "undefined") {
    return fallbackStore();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallbackStore();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoreData> & Record<string, unknown>;
    return {
      profiles: Array.isArray(parsed.profiles) ? (parsed.profiles as DIDProfile[]) : [],
    };
  } catch {
    return fallbackStore();
  }
}

function writeStore(nextStore: StoreData): void {
  memoryStore.profiles = nextStore.profiles.map((profile) => ({ ...profile }));

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
  }
}

function withStoreMutation(mutator: (data: StoreData) => void): void {
  const data = readStore();
  mutator(data);
  writeStore(data);
}

export function resetTrxStore(): void {
  writeStore({ profiles: [] });
}

export function getProfileByWallet(walletAddress: string): DIDProfile | null {
  const data = readStore();
  return data.profiles.find((profile) => profile.wallet_address === walletAddress) ?? null;
}

export function getProfileByDid(did: string): DIDProfile | null {
  const data = readStore();
  return data.profiles.find((profile) => profile.did === did) ?? null;
}

export function saveProfile(profile: DIDProfile): void {
  withStoreMutation((data) => {
    const index = data.profiles.findIndex(
      (candidate) => candidate.wallet_address === profile.wallet_address || candidate.did === profile.did
    );

    if (index >= 0) {
      data.profiles[index] = profile;
      return;
    }

    data.profiles.push(profile);
  });
}
