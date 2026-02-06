// ── Core domain types ──

export type Role = "SHIPPER" | "CARRIER";

export type OrderState = "PENDING" | "BOOKED" | "DONE" | "CANCELLED" | "EXPIRED";

export interface DIDProfile {
  wallet_address: string;
  did: string;
  role: Role;
  company_name: string;
  country: string;
  city: string;
  legal_id_hash: string;
  load_id_standard: string | null; // shipper only
}

export interface OrderPayload {
  from: string;
  to: string;
  pickup_date: string;
  pickup_window: string;
  weight: number;
  reference: string;
}

export interface OrderToken {
  order_id: string;
  issuer_did: string;
  carrier_did: string | null;
  state: OrderState;
  payload_offledger: OrderPayload;
  fingerprint: string;
  created_at: string;
  updated_at: string;
  last_network_proof: string | null;
  last_verified_at: string | null;
}

export interface NetworkProof {
  tx_id: string;
  block_id: string;
  timestamp: string;
  order_id: string;
  state: OrderState;
  issuer_did: string;
  carrier_did: string | null;
  verified: boolean;
}

export interface VerificationResult {
  state: OrderState;
  issuer_did: string;
  carrier_did: string | null;
  proof: NetworkProof;
  verified: boolean;
}

export interface Actor {
  role: Role;
  did: string;
}
