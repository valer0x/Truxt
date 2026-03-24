import type { OrderPayload } from "@/domain/types";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

export async function computeFingerprint(payload: OrderPayload, issuerDid: string): Promise<string> {
  const serialized = JSON.stringify({
    from: payload.from,
    to: payload.to,
    pickup_date: payload.pickup_date,
    weight: payload.weight,
    reference: payload.reference,
    issuer: issuerDid,
  });

  return sha256(serialized);
}
