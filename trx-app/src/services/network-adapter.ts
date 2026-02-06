// ── Network Adapter interface ──
// Swap MockIotaAdapter with a real IOTA adapter by implementing this interface.

import { NetworkProof, OrderState, VerificationResult } from "@/domain/types";

export interface NetworkAdapter {
  /**
   * Anchor a newly created order on the network.
   */
  anchorCreate(
    orderId: string,
    fingerprint: string,
    issuerDid: string,
    state: OrderState
  ): Promise<NetworkProof>;

  /**
   * Anchor a state update on the network.
   */
  anchorUpdate(
    orderId: string,
    newState: OrderState,
    issuerDid: string,
    carrierDid?: string | null,
    prevProof?: string | null
  ): Promise<NetworkProof>;

  /**
   * Verify an order's current state on the network.
   */
  verify(orderId: string): Promise<VerificationResult>;
}
