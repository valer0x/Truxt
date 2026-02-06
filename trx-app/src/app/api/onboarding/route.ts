import { NextRequest, NextResponse } from "next/server";
import { registerProfile } from "@/services/did-service";
import { Role } from "@/domain/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet_address, role, company_name, country, city, legal_id, load_id_standard } = body;

    if (!wallet_address || !role || !company_name || !country || !city || !legal_id) {
      return NextResponse.json(
        { error: "Missing required fields: wallet_address, role, company_name, country, city, legal_id" },
        { status: 400 }
      );
    }

    if (role !== "SHIPPER" && role !== "CARRIER") {
      return NextResponse.json(
        { error: "role must be SHIPPER or CARRIER" },
        { status: 400 }
      );
    }

    const profile = registerProfile({
      wallet_address: wallet_address.trim(),
      role: role as Role,
      company_name,
      country,
      city,
      legal_id,
      load_id_standard: load_id_standard ?? null,
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message === "Wallet already registered" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
