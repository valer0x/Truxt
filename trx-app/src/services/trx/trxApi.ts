import { canActorCreate, canActorPerformTransition } from "@/domain/stateMachine";
import type {
  DIDProfile,
  LoadType,
  NetworkProof,
  OrderPayload,
  OrderToken,
  ProcessType,
  Role,
  VerifiedOrderRow,
} from "@/domain/types";
import { computeFingerprint, sha256 } from "@/lib/hash";
import { createOrderId } from "@/lib/id";
import { lookupByDid, lookupByWallet, registerProfile } from "@/services/trx/didService";
import { getNetworkAdapter } from "@/services/trx/iotaNetworkAdapter";
import { getOrderById, listOrdersForCarrier, listOrdersForShipper } from "@/services/trx/iotaOnChainReadModel";
import { getOnChainWriteReadiness } from "@/services/trx/iotaOnChainConfig";

const PROCESS_TYPES: ProcessType[] = ["Tendering", "Auction", "Direct Book"];
const LOAD_TYPES: LoadType[] = ["FTL", "LTL"];

export class TrxApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function enforce(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) {
    throw new TrxApiError(status, message);
  }
}

function enforceOnChainWriteReady(): void {
  const readiness = getOnChainWriteReadiness();
  if (!readiness.ready) {
    throw new TrxApiError(503, readiness.message);
  }
}

function resolveActor(actorDid: string): DIDProfile {
  const profile = lookupByDid(actorDid);
  enforce(profile, 401, "Actor DID not found");
  return profile;
}

function normalizePayload(partial: Partial<OrderPayload>): Omit<OrderPayload, "equipment_requirements_hash"> {
  const processType = PROCESS_TYPES.includes(partial.process_type as ProcessType)
    ? (partial.process_type as ProcessType)
    : "Tendering";
  const loadType = LOAD_TYPES.includes(partial.load_type as LoadType) ? (partial.load_type as LoadType) : "FTL";

  return {
    from: partial.from?.trim() || "-",
    to: partial.to?.trim() || "-",
    pickup_date: partial.pickup_date || new Date().toISOString().slice(0, 10),
    pickup_window: partial.pickup_window || "",
    weight: Number(partial.weight) || 0,
    reference: partial.reference?.trim() || "",
    process_type: processType,
    load_type: loadType,
  };
}

export async function connectWalletAuth(walletAddress: string): Promise<
  | {
      registered: true;
      role: Role;
      did: string;
      profile: DIDProfile;
      redirect: "/dashboard";
    }
  | {
      registered: false;
      redirect: "/onboarding";
    }
> {
  const cleaned = walletAddress.trim();
  enforce(cleaned, 400, "wallet_address is required");

  const profile = lookupByWallet(cleaned);
  if (profile) {
    return {
      registered: true,
      role: profile.role,
      did: profile.did,
      profile,
      redirect: "/dashboard",
    };
  }

  return {
    registered: false,
    redirect: "/onboarding",
  };
}

export async function registerOnboarding(data: {
  wallet_address: string;
  role: Role;
  company_name: string;
  country: string;
  city: string;
  legal_id: string;
  load_id_standard?: string | null;
}): Promise<DIDProfile> {
  enforce(data.wallet_address?.trim(), 400, "wallet_address is required");
  enforce(data.role === "SHIPPER" || data.role === "CARRIER", 400, "role must be SHIPPER or CARRIER");
  enforce(data.company_name?.trim(), 400, "company_name is required");
  enforce(data.country?.trim(), 400, "country is required");
  enforce(data.city?.trim(), 400, "city is required");
  enforce(data.legal_id?.trim(), 400, "legal_id is required");

  try {
    return await registerProfile({
      wallet_address: data.wallet_address.trim(),
      role: data.role,
      company_name: data.company_name.trim(),
      country: data.country.trim(),
      city: data.city.trim(),
      legal_id: data.legal_id.trim(),
      load_id_standard: data.load_id_standard ?? null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Wallet already registered") {
      throw new TrxApiError(409, error.message);
    }
    throw error;
  }
}

export async function createOrder(
  actorDid: string,
  payloadInput: Partial<OrderPayload> & { equipment_requirements?: Record<string, unknown> }
): Promise<{ token: OrderToken; proof: NetworkProof }> {
  enforceOnChainWriteReady();

  const actor = resolveActor(actorDid);

  const authCheck = canActorCreate({ role: actor.role, did: actor.did });
  if (!authCheck.allowed) {
    throw new TrxApiError(403, authCheck.reason);
  }

  const payloadBase = normalizePayload(payloadInput);
  const equipmentHash = await sha256(JSON.stringify(payloadInput.equipment_requirements ?? {}));
  const payload: OrderPayload = {
    ...payloadBase,
    equipment_requirements_hash: equipmentHash,
  };

  const orderId = createOrderId();
  const fingerprint = await computeFingerprint(payload, actorDid);

  const network = getNetworkAdapter();
  const proof = await network.anchorCreate(orderId, fingerprint, actorDid, payload);

  const now = new Date().toISOString();
  const token: OrderToken = {
    order_id: orderId,
    issuer_did: actorDid,
    carrier_did: null,
    state: "PENDING",
    payload_offledger: payload,
    fingerprint,
    created_at: now,
    updated_at: now,
    last_network_proof: proof.tx_id,
    last_verified_at: proof.timestamp,
  };

  return { token, proof };
}

export async function listOrders(actorDid: string): Promise<
  | { orders: VerifiedOrderRow[] }
  | {
      pending: VerifiedOrderRow[];
      my_booked: VerifiedOrderRow[];
      my_done: VerifiedOrderRow[];
    }
> {
  const actor = resolveActor(actorDid);

  if (actor.role === "SHIPPER") {
    return { orders: await listOrdersForShipper(actorDid) };
  }

  const carrierOrders = await listOrdersForCarrier(actorDid);
  return {
    pending: carrierOrders.pending,
    my_booked: carrierOrders.my_booked,
    my_done: carrierOrders.my_done,
  };
}

export async function bookOrder(orderId: string, actorDid: string): Promise<{ token: OrderToken; proof: NetworkProof }> {
  enforceOnChainWriteReady();

  const actor = resolveActor(actorDid);
  const token = await getOrderById(orderId);

  enforce(token, 404, "Order not found");

  const network = getNetworkAdapter();
  const verification = await network.verify(orderId);

  enforce(verification.verified, 409, "Order cannot be verified on network. Action blocked.");
  enforce(verification.state === "PENDING", 409, `Order is ${verification.state} on network, expected PENDING`);

  const authCheck = canActorPerformTransition({ role: actor.role, did: actor.did }, token, "BOOKED");
  if (!authCheck.allowed) {
    throw new TrxApiError(403, authCheck.reason);
  }

  const proof = await network.anchorUpdate(orderId, "BOOKED", token.issuer_did, actorDid, token.last_network_proof);
  const updated: OrderToken = {
    ...token,
    state: "BOOKED",
    carrier_did: actorDid,
    updated_at: new Date().toISOString(),
    last_network_proof: proof.tx_id,
    last_verified_at: proof.timestamp,
  };

  return { token: updated, proof };
}

export async function markOrderDone(orderId: string, actorDid: string): Promise<{ token: OrderToken; proof: NetworkProof }> {
  enforceOnChainWriteReady();

  const actor = resolveActor(actorDid);
  const token = await getOrderById(orderId);

  enforce(token, 404, "Order not found");

  const network = getNetworkAdapter();
  const verification = await network.verify(orderId);

  enforce(verification.verified, 409, "Order cannot be verified on network. Action blocked.");
  enforce(verification.state === "BOOKED", 409, `Order is ${verification.state} on network, expected BOOKED`);
  enforce(verification.carrier_did === actorDid, 403, "Network verification: you are not the carrier who booked this load");

  const authCheck = canActorPerformTransition({ role: actor.role, did: actor.did }, token, "DONE");
  if (!authCheck.allowed) {
    throw new TrxApiError(403, authCheck.reason);
  }

  const proof = await network.anchorUpdate(
    orderId,
    "DONE",
    token.issuer_did,
    token.carrier_did,
    token.last_network_proof
  );

  const updated: OrderToken = {
    ...token,
    state: "DONE",
    updated_at: new Date().toISOString(),
    last_network_proof: proof.tx_id,
    last_verified_at: proof.timestamp,
  };

  return { token: updated, proof };
}

/**
 * Cancel a load. Valid from PENDING or BOOKED state (WP Section IV).
 * Only the issuing SHIPPER may cancel.
 */
export async function cancelOrder(orderId: string, actorDid: string): Promise<{ token: OrderToken; proof: NetworkProof }> {
  enforceOnChainWriteReady();

  const actor = resolveActor(actorDid);
  const token = await getOrderById(orderId);
  enforce(token, 404, "Order not found");

  const network = getNetworkAdapter();
  const verification = await network.verify(orderId);
  enforce(verification.verified, 409, "Order cannot be verified on network. Action blocked.");

  const authCheck = canActorPerformTransition({ role: actor.role, did: actor.did }, token, "CANCELLED");
  if (!authCheck.allowed) {
    throw new TrxApiError(403, authCheck.reason);
  }

  const proof = await network.anchorUpdate(
    orderId,
    "CANCELLED",
    token.issuer_did,
    token.carrier_did,
    token.last_network_proof
  );

  const updated: OrderToken = {
    ...token,
    state: "CANCELLED",
    updated_at: new Date().toISOString(),
    last_network_proof: proof.tx_id,
    last_verified_at: proof.timestamp,
  };

  return { token: updated, proof };
}

/**
 * Expire a PENDING load. Valid from PENDING state only (WP Section IV).
 * Only the issuing SHIPPER may trigger expiry (temporary rule — see stateMachine.ts).
 */
export async function expireOrder(orderId: string, actorDid: string): Promise<{ token: OrderToken; proof: NetworkProof }> {
  enforceOnChainWriteReady();

  const actor = resolveActor(actorDid);
  const token = await getOrderById(orderId);
  enforce(token, 404, "Order not found");

  const network = getNetworkAdapter();
  const verification = await network.verify(orderId);
  enforce(verification.verified, 409, "Order cannot be verified on network. Action blocked.");
  enforce(
    verification.state === "PENDING",
    409,
    `Order is ${verification.state} on network, expected PENDING for expiry`
  );

  const authCheck = canActorPerformTransition({ role: actor.role, did: actor.did }, token, "EXPIRED");
  if (!authCheck.allowed) {
    throw new TrxApiError(403, authCheck.reason);
  }

  const proof = await network.anchorUpdate(
    orderId,
    "EXPIRED",
    token.issuer_did,
    token.carrier_did,
    token.last_network_proof
  );

  const updated: OrderToken = {
    ...token,
    state: "EXPIRED",
    updated_at: new Date().toISOString(),
    last_network_proof: proof.tx_id,
    last_verified_at: proof.timestamp,
  };

  return { token: updated, proof };
}
