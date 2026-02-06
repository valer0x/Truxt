// ── In-memory store with clear interface for future DB swap ──
// Replace this module with Prisma/SQLite or any DB adapter.

import { DIDProfile, OrderToken, NetworkProof, OrderState } from "@/domain/types";

// ── DID Profiles ──
const profiles: Map<string, DIDProfile> = new Map(); // key: wallet_address

export function getProfileByWallet(wallet: string): DIDProfile | null {
  return profiles.get(wallet) ?? null;
}

export function getProfileByDid(did: string): DIDProfile | null {
  for (const p of profiles.values()) {
    if (p.did === did) return p;
  }
  return null;
}

export function saveProfile(profile: DIDProfile): void {
  profiles.set(profile.wallet_address, profile);
}

export function allProfiles(): DIDProfile[] {
  return Array.from(profiles.values());
}

// ── Order Tokens ──
const orders: Map<string, OrderToken> = new Map(); // key: order_id

export function getOrder(orderId: string): OrderToken | null {
  return orders.get(orderId) ?? null;
}

export function saveOrder(order: OrderToken): void {
  orders.set(order.order_id, order);
}

export function getOrdersByIssuer(issuerDid: string): OrderToken[] {
  return Array.from(orders.values()).filter((o) => o.issuer_did === issuerDid);
}

export function getOrdersByState(state: OrderState): OrderToken[] {
  return Array.from(orders.values()).filter((o) => o.state === state);
}

export function getOrdersByCarrier(carrierDid: string): OrderToken[] {
  return Array.from(orders.values()).filter(
    (o) => o.carrier_did === carrierDid
  );
}

export function allOrders(): OrderToken[] {
  return Array.from(orders.values());
}

// ── Network Ledger (mock) ──
const ledger: Map<string, NetworkProof> = new Map(); // key: order_id

export function getLedgerEntry(orderId: string): NetworkProof | null {
  return ledger.get(orderId) ?? null;
}

export function saveLedgerEntry(proof: NetworkProof): void {
  ledger.set(proof.order_id, proof);
}
