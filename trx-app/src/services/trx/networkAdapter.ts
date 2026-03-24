import type { NetworkProof, OrderPayload, OrderState, VerificationResult } from "@/domain/types";

export interface NetworkAdapter {
  anchorCreate(
    orderId: string,
    fingerprint: string,
    issuerDid: string,
    payload: OrderPayload
  ): Promise<NetworkProof>;
  anchorUpdate(
    orderId: string,
    newState: OrderState,
    issuerDid: string,
    carrierDid?: string | null,
    prevProof?: string | null
  ): Promise<NetworkProof>;
  verify(orderId: string): Promise<VerificationResult>;
}
