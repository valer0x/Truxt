import { NextRequest, NextResponse } from "next/server";
import { lookupByDid } from "@/services/did-service";
import { getNetworkAdapter } from "@/services/mock-iota-adapter";
import { canActorPerformTransition } from "@/domain/state-machine";
import { getOrder, saveOrder } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ order_id: string }> }
) {
  try {
    const { order_id } = await params;
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

    const token = getOrder(order_id);
    if (!token) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify on network first
    const network = getNetworkAdapter();
    const verification = await network.verify(order_id);

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Order cannot be verified on network. Action blocked." },
        { status: 409 }
      );
    }

    if (verification.state !== "PENDING") {
      return NextResponse.json(
        { error: `Order is ${verification.state} on network, expected PENDING` },
        { status: 409 }
      );
    }

    // Authorization check
    const authCheck = canActorPerformTransition(
      { role: profile.role, did: profile.did },
      token,
      "BOOKED"
    );

    if (!authCheck.allowed) {
      return NextResponse.json(
        { error: authCheck.reason },
        { status: 403 }
      );
    }

    // Transition
    const proof = await network.anchorUpdate(
      order_id,
      "BOOKED",
      token.issuer_did,
      actorDid,
      token.last_network_proof
    );

    const updated = {
      ...token,
      state: "BOOKED" as const,
      carrier_did: actorDid,
      updated_at: new Date().toISOString(),
      last_network_proof: proof.tx_id,
      last_verified_at: proof.timestamp,
    };

    saveOrder(updated);

    return NextResponse.json({ token: updated, proof });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
