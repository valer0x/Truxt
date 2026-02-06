// ── Mock IOTA Network Adapter ──
// Simulates IOTA Tangle anchoring using an in-memory ledger table.
// Replace with real IOTA SDK calls for production.

import { v4 as uuidv4 } from "uuid";
import { NetworkProof, OrderState, VerificationResult } from "@/domain/types";
import { NetworkAdapter } from "./network-adapter";
import { getLedgerEntry, saveLedgerEntry } from "@/lib/store";

export class MockIotaAdapter implements NetworkAdapter {
  async anchorCreate(
    orderId: string,
    fingerprint: string,
    issuerDid: string,
    state: OrderState
  ): Promise<NetworkProof> {
    const proof: NetworkProof = {
      tx_id: `mock_tx_${uuidv4().slice(0, 12)}`,
      block_id: `mock_blk_${uuidv4().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      order_id: orderId,
      state,
      issuer_did: issuerDid,
      carrier_did: null,
      verified: true,
    };
    saveLedgerEntry(proof);
    return proof;
  }

  async anchorUpdate(
    orderId: string,
    newState: OrderState,
    issuerDid: string,
    carrierDid?: string | null,
    prevProof?: string | null
  ): Promise<NetworkProof> {
    const existing = getLedgerEntry(orderId);
    if (!existing) {
      throw new Error(`No ledger entry found for order ${orderId}`);
    }

    const proof: NetworkProof = {
      tx_id: `mock_tx_${uuidv4().slice(0, 12)}`,
      block_id: `mock_blk_${uuidv4().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      order_id: orderId,
      state: newState,
      issuer_did: issuerDid,
      carrier_did: carrierDid ?? existing.carrier_did,
      verified: true,
    };
    saveLedgerEntry(proof);
    return proof;
  }

  async verify(orderId: string): Promise<VerificationResult> {
    const entry = getLedgerEntry(orderId);
    if (!entry) {
      return {
        state: "PENDING",
        issuer_did: "",
        carrier_did: null,
        proof: {
          tx_id: "",
          block_id: "",
          timestamp: "",
          order_id: orderId,
          state: "PENDING",
          issuer_did: "",
          carrier_did: null,
          verified: false,
        },
        verified: false,
      };
    }

    return {
      state: entry.state,
      issuer_did: entry.issuer_did,
      carrier_did: entry.carrier_did,
      proof: entry,
      verified: entry.verified,
    };
  }
}

// Singleton instance
let _adapter: NetworkAdapter | null = null;

export function getNetworkAdapter(): NetworkAdapter {
  if (!_adapter) {
    _adapter = new MockIotaAdapter();
  }
  return _adapter;
}
