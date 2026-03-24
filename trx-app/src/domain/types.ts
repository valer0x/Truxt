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
  load_id_standard: string | null;
}

export type ProcessType = "Tendering" | "Auction" | "Direct Book";
export type LoadType = "FTL" | "LTL";

export interface OrderPayload {
  from: string;
  to: string;
  pickup_date: string;
  pickup_window: string;
  weight: number;
  reference: string;
  process_type: ProcessType;
  load_type: LoadType;
  equipment_requirements_hash: string;
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

export interface VerifiedOrderRow extends OrderToken {
  verified_state: OrderState;
  verified: boolean;
  verified_proof: NetworkProof;
}

export type BlockchainAction = "CREATE" | "STATE_UPDATE";

export interface BlockchainTransaction {
  tx_id: string;
  block_id: string;
  prev_tx_id: string | null;
  order_id: string;
  action: BlockchainAction;
  state: OrderState;
  issuer_did: string;
  carrier_did: string | null;
  fingerprint: string | null;
  payload_hash: string | null;
  order_snapshot_hash: string;
  timestamp: string;
}

export type NetworkEventType = "LOAD_CREATED" | "LOAD_STATE_CHANGED";

export interface NetworkEventPayload {
  event_id: string;
  type: NetworkEventType;
  order_id: string;
  tx_id: string;
  state: OrderState;
  issuer_did: string;
  carrier_did: string | null;
  timestamp: string;
}
