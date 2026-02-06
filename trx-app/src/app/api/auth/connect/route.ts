import { NextRequest, NextResponse } from "next/server";
import { lookupByWallet } from "@/services/did-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet_address } = body;

    if (!wallet_address || typeof wallet_address !== "string") {
      return NextResponse.json(
        { error: "wallet_address is required" },
        { status: 400 }
      );
    }

    const profile = lookupByWallet(wallet_address.trim());

    if (profile) {
      return NextResponse.json({
        registered: true,
        role: profile.role,
        did: profile.did,
        redirect: "/dashboard",
      });
    }

    return NextResponse.json({
      registered: false,
      redirect: "/onboarding",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
