// ── Seed / Demo Data Script ──
// Run with: npx tsx src/lib/seed.ts
// This script demonstrates how the system works by:
// 1. Registering a shipper and carrier
// 2. Creating a load
// 3. Booking the load
// 4. Marking it as done

import { registerProfile, lookupByDid } from "../services/did-service";
import { getNetworkAdapter } from "../services/mock-iota-adapter";
import { computeFingerprint } from "./fingerprint";
import { saveOrder, getOrder } from "./store";
import { v4 as uuidv4 } from "uuid";
import { OrderPayload, OrderToken } from "../domain/types";

async function seed() {
  console.log("=== TRX Seed Script ===\n");

  // 1. Register Shipper
  const shipper = registerProfile({
    wallet_address: "0xSHIPPER001",
    role: "SHIPPER",
    company_name: "Global Freight Co",
    country: "US",
    legal_id: "MC-100001",
    load_id_standard: "ISO 17712",
  });
  console.log("Shipper registered:", shipper.did);

  // 2. Register Carrier
  const carrier = registerProfile({
    wallet_address: "0xCARRIER001",
    role: "CARRIER",
    company_name: "Swift Transport LLC",
    country: "US",
    legal_id: "MC-200001",
  });
  console.log("Carrier registered:", carrier.did);

  // 3. Create a load
  const payload: OrderPayload = {
    from: "Chicago, IL",
    to: "Dallas, TX",
    pickup_date: "2026-02-10",
    pickup_window: "8:00 AM - 12:00 PM",
    weight: 42000,
    reference: "PO-SEED-001",
  };

  const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
  const fingerprint = computeFingerprint(payload, shipper.did);
  const network = getNetworkAdapter();
  const createProof = await network.anchorCreate(
    orderId,
    fingerprint,
    shipper.did,
    "PENDING"
  );

  const token: OrderToken = {
    order_id: orderId,
    issuer_did: shipper.did,
    carrier_did: null,
    state: "PENDING",
    payload_offledger: payload,
    fingerprint,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_network_proof: createProof.tx_id,
    last_verified_at: createProof.timestamp,
  };
  saveOrder(token);
  console.log(`\nLoad created: ${orderId}`);
  console.log("  State: PENDING");
  console.log("  Proof TX:", createProof.tx_id);

  // 4. Verify
  const v1 = await network.verify(orderId);
  console.log("  Verified:", v1.verified, "State:", v1.state);

  // 5. Book it
  const bookProof = await network.anchorUpdate(
    orderId,
    "BOOKED",
    shipper.did,
    carrier.did,
    createProof.tx_id
  );
  const booked = {
    ...token,
    state: "BOOKED" as const,
    carrier_did: carrier.did,
    updated_at: new Date().toISOString(),
    last_network_proof: bookProof.tx_id,
    last_verified_at: bookProof.timestamp,
  };
  saveOrder(booked);
  console.log(`\nLoad booked by carrier: ${carrier.did}`);
  console.log("  Proof TX:", bookProof.tx_id);

  // 6. Mark done
  const doneProof = await network.anchorUpdate(
    orderId,
    "DONE",
    shipper.did,
    carrier.did,
    bookProof.tx_id
  );
  const done = {
    ...booked,
    state: "DONE" as const,
    updated_at: new Date().toISOString(),
    last_network_proof: doneProof.tx_id,
    last_verified_at: doneProof.timestamp,
  };
  saveOrder(done);
  console.log(`\nLoad marked as done`);
  console.log("  Proof TX:", doneProof.tx_id);

  // Final verify
  const v2 = await network.verify(orderId);
  console.log("\nFinal verification:", v2.verified, "State:", v2.state);

  console.log("\n=== Seed Complete ===");
}

seed().catch(console.error);
