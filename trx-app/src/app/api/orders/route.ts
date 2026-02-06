import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { lookupByDid } from "@/services/did-service";
import { getNetworkAdapter } from "@/services/mock-iota-adapter";
import { canActorCreate } from "@/domain/state-machine";
import { OrderToken, OrderPayload } from "@/domain/types";
import { computeFingerprint } from "@/lib/fingerprint";
import {
  saveOrder,
  getOrder,
  getOrdersByIssuer,
  getOrdersByState,
  getOrdersByCarrier,
} from "@/lib/store";

// POST /api/orders — Create a new load (SHIPPER only)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const actorDid = req.headers.get("x-actor-did");

    if (!actorDid) {
      return NextResponse.json(
        { error: "x-actor-did header is required" },
        { status: 401 }
      );
    }

    const profile = lookupByDid(actorDid);
    if (!profile) {
      return NextResponse.json(
        { error: "Actor DID not found" },
        { status: 401 }
      );
    }

    const authCheck = canActorCreate({ role: profile.role, did: profile.did });
    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason },
        { status: 403 }
      );
    }

    const { from, to, pickup_date, pickup_window, weight, reference } = body;
    if (!from || !to || !pickup_date || !weight) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, pickup_date, weight" },
        { status: 400 }
      );
    }

    const payload: OrderPayload = {
      from,
      to,
      pickup_date,
      pickup_window: pickup_window ?? "",
      weight: Number(weight),
      reference: reference ?? "",
    };

    const orderId = `ORD-${uuidv4().slice(0, 8).toUpperCase()}`;
    const fingerprint = computeFingerprint(payload, actorDid);

    // Anchor on network
    const network = getNetworkAdapter();
    const proof = await network.anchorCreate(
      orderId,
      fingerprint,
      actorDid,
      "PENDING"
    );

    const token: OrderToken = {
      order_id: orderId,
      issuer_did: actorDid,
      carrier_did: null,
      state: "PENDING",
      payload_offledger: payload,
      fingerprint,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_network_proof: proof.tx_id,
      last_verified_at: proof.timestamp,
    };

    saveOrder(token);

    return NextResponse.json({ token, proof }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/orders — List orders based on role
export async function GET(req: NextRequest) {
  try {
    const actorDid = req.headers.get("x-actor-did");

    if (!actorDid) {
      return NextResponse.json(
        { error: "x-actor-did header is required" },
        { status: 401 }
      );
    }

    const profile = lookupByDid(actorDid);
    if (!profile) {
      return NextResponse.json(
        { error: "Actor DID not found" },
        { status: 401 }
      );
    }

    const network = getNetworkAdapter();

    if (profile.role === "SHIPPER") {
      const orders = getOrdersByIssuer(actorDid);
      const verified = await Promise.all(
        orders.map(async (o) => {
          const v = await network.verify(o.order_id);
          return {
            ...o,
            verified_state: v.state,
            verified: v.verified,
            verified_proof: v.proof,
          };
        })
      );
      return NextResponse.json({ orders: verified });
    }

    // CARRIER: pending loads + my booked loads
    const pendingOrders = getOrdersByState("PENDING");
    const myBookedOrders = getOrdersByCarrier(actorDid).filter(
      (o) => o.state === "BOOKED"
    );

    const verifyAll = async (list: OrderToken[]) =>
      Promise.all(
        list.map(async (o) => {
          const v = await network.verify(o.order_id);
          return {
            ...o,
            verified_state: v.state,
            verified: v.verified,
            verified_proof: v.proof,
          };
        })
      );

    const [pending, myBooked] = await Promise.all([
      verifyAll(pendingOrders),
      verifyAll(myBookedOrders),
    ]);

    return NextResponse.json({ pending, my_booked: myBooked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
