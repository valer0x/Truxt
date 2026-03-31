/**
 * LOAD PAYLOAD STORE — OFF-CHAIN OPERATIONAL DATA (REQ-027)
 *
 * On-chain anchors store only: order_id, fingerprint, state, issuer_did,
 * carrier_did, and timestamps. Operational payload (from, to, weight, etc.)
 * is stored here in localStorage and never sent to the smart contract.
 *
 * LIMITATION: Storage is local to this browser. On a different device,
 * getLoadPayload() returns null and the read model falls back to placeholder
 * values ("-"). A future implementation should use a shared off-chain store
 * (e.g. encrypted IPFS or a trusted backend) to make payload portable.
 */

import type { OrderPayload } from "@/domain/types";

const STORE_KEY_PREFIX = "trx:payload:";

export function saveLoadPayload(orderId: string, payload: OrderPayload): void {
  try {
    localStorage.setItem(STORE_KEY_PREFIX + orderId, JSON.stringify(payload));
  } catch {
    // localStorage may be unavailable (private browsing quota exceeded, SSR).
    // Payload persistence is best-effort; the anchor transaction still proceeds.
    if (import.meta.env.DEV) {
      console.warn("[loadPayloadStore] Failed to persist payload for", orderId);
    }
  }
}

export function getLoadPayload(orderId: string): OrderPayload | null {
  try {
    const raw = localStorage.getItem(STORE_KEY_PREFIX + orderId);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as OrderPayload;
  } catch {
    return null;
  }
}

export function removeLoadPayload(orderId: string): void {
  try {
    localStorage.removeItem(STORE_KEY_PREFIX + orderId);
  } catch {
    // ignore — best-effort cleanup
  }
}
