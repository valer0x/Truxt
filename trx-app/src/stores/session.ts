import { computed, ref } from "vue";
import { defineStore } from "pinia";
import type { Role } from "@/domain/types";

const SESSION_KEY = "trx_session";
const ONBOARDING_WALLET_KEY = "trx_onboard_wallet";

export interface SessionUser {
  walletAddress: string;
  did: string;
  role: Role;
  companyName?: string;
  country?: string;
  city?: string;
  loadIdStandard?: string | null;
}

function readSessionStorage(): SessionUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export const useSessionStore = defineStore("session", () => {
  const session = ref<SessionUser | null>(readSessionStorage());
  const pendingOnboardingWallet = ref<string | null>(
    typeof window === "undefined" ? null : window.sessionStorage.getItem(ONBOARDING_WALLET_KEY)
  );

  const isAuthenticated = computed(() => Boolean(session.value));

  function setSession(nextSession: SessionUser | null): void {
    session.value = nextSession;
    if (typeof window === "undefined") {
      return;
    }

    if (nextSession) {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  }

  function clearSession(): void {
    setSession(null);
  }

  function setPendingOnboardingWallet(walletAddress: string | null): void {
    pendingOnboardingWallet.value = walletAddress;
    if (typeof window === "undefined") {
      return;
    }

    if (walletAddress) {
      window.sessionStorage.setItem(ONBOARDING_WALLET_KEY, walletAddress);
    } else {
      window.sessionStorage.removeItem(ONBOARDING_WALLET_KEY);
    }
  }

  function hydrateFromStorage(): void {
    session.value = readSessionStorage();
    pendingOnboardingWallet.value =
      typeof window === "undefined" ? null : window.sessionStorage.getItem(ONBOARDING_WALLET_KEY);
  }

  return {
    session,
    isAuthenticated,
    pendingOnboardingWallet,
    setSession,
    clearSession,
    setPendingOnboardingWallet,
    hydrateFromStorage,
  };
});
