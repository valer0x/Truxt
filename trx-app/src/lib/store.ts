// ── In-memory store with clear interface for future DB swap ──
// Replace this module with Prisma/SQLite or any DB adapter.
// Uses globalThis to survive Next.js hot-reloads in dev mode.

import { DIDProfile, OrderToken, NetworkProof, OrderState } from "@/domain/types";

interface StoreData {
  profiles: Map<string, DIDProfile>;
  orders: Map<string, OrderToken>;
  ledger: Map<string, NetworkProof>;
}

const g = globalThis as unknown as { __trx_store?: StoreData };

if (!g.__trx_store) {
  g.__trx_store = {
    profiles: new Map(),
    orders: new Map(),
    ledger: new Map(),
  };
}

const store = g.__trx_store;

// ── DID Profiles ──

export function getProfileByWallet(wallet: string): DIDProfile | null {
  return store.profiles.get(wallet) ?? null;
}

export function getProfileByDid(did: string): DIDProfile | null {
  for (const p of store.profiles.values()) {
    if (p.did === did) return p;
  }
  return null;
}

export function saveProfile(profile: DIDProfile): void {
  store.profiles.set(profile.wallet_address, profile);
}

export function allProfiles(): DIDProfile[] {
  return Array.from(store.profiles.values());
}

// ── Order Tokens ──

export function getOrder(orderId: string): OrderToken | null {
  return store.orders.get(orderId) ?? null;
}

export function saveOrder(order: OrderToken): void {
  store.orders.set(order.order_id, order);
}

export function getOrdersByIssuer(issuerDid: string): OrderToken[] {
  return Array.from(store.orders.values()).filter((o) => o.issuer_did === issuerDid);
}

export function getOrdersByState(state: OrderState): OrderToken[] {
  return Array.from(store.orders.values()).filter((o) => o.state === state);
}

export function getOrdersByCarrier(carrierDid: string): OrderToken[] {
  return Array.from(store.orders.values()).filter(
    (o) => o.carrier_did === carrierDid
  );
}

export function allOrders(): OrderToken[] {
  return Array.from(store.orders.values());
}

// ── Network Ledger (mock) ──

export function getLedgerEntry(orderId: string): NetworkProof | null {
  return store.ledger.get(orderId) ?? null;
}

export function saveLedgerEntry(proof: NetworkProof): void {
  store.ledger.set(proof.order_id, proof);
}
