import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSessionStore } from "@/stores/session";
import type { SessionUser } from "@/stores/session";

const SESSION_KEY = "trx_session";
const ONBOARDING_WALLET_KEY = "trx_onboard_wallet";

function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    walletAddress: "0xABC123",
    did: "did:iota:test1",
    role: "shipper",
    companyName: "Acme Corp",
    country: "IT",
    city: "Milan",
    ...overrides,
  };
}

describe("session store", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it("initially session is null and isAuthenticated is false", () => {
    const store = useSessionStore();
    expect(store.session).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it("setSession stores user and isAuthenticated becomes true", () => {
    const store = useSessionStore();
    const user = makeUser();
    store.setSession(user);
    expect(store.session).toEqual(user);
    expect(store.isAuthenticated).toBe(true);
  });

  it("setSession writes to sessionStorage", () => {
    const store = useSessionStore();
    const user = makeUser();
    store.setSession(user);
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(user);
  });

  it("clearSession removes session and updates sessionStorage", () => {
    const store = useSessionStore();
    store.setSession(makeUser());
    store.clearSession();
    expect(store.session).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("setPendingOnboardingWallet stores and retrieves wallet address", () => {
    const store = useSessionStore();
    store.setPendingOnboardingWallet("0xWALLET");
    expect(store.pendingOnboardingWallet).toBe("0xWALLET");
    expect(window.sessionStorage.getItem(ONBOARDING_WALLET_KEY)).toBe("0xWALLET");
  });

  it("setPendingOnboardingWallet(null) clears it", () => {
    const store = useSessionStore();
    store.setPendingOnboardingWallet("0xWALLET");
    store.setPendingOnboardingWallet(null);
    expect(store.pendingOnboardingWallet).toBeNull();
    expect(window.sessionStorage.getItem(ONBOARDING_WALLET_KEY)).toBeNull();
  });

  it("hydrateFromStorage reads from sessionStorage", () => {
    const user = makeUser();
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window.sessionStorage.setItem(ONBOARDING_WALLET_KEY, "0xHYDRATE");

    const store = useSessionStore();
    store.hydrateFromStorage();
    expect(store.session).toEqual(user);
    expect(store.pendingOnboardingWallet).toBe("0xHYDRATE");
  });

  it("session data structure includes all expected fields", () => {
    const store = useSessionStore();
    const user = makeUser({
      walletAddress: "0xFULL",
      did: "did:iota:full",
      role: "carrier",
      companyName: "Logistics Inc",
      country: "DE",
      city: "Berlin",
    });
    store.setSession(user);
    expect(store.session).toMatchObject({
      walletAddress: "0xFULL",
      did: "did:iota:full",
      role: "carrier",
      companyName: "Logistics Inc",
      country: "DE",
      city: "Berlin",
    });
  });
});
