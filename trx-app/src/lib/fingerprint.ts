// ── Fingerprint computation: hash of payload fields + issuer DID ──

import { createHash } from "crypto";
import { OrderPayload } from "@/domain/types";

export function computeFingerprint(
  payload: OrderPayload,
  issuerDid: string
): string {
  const data = JSON.stringify({
    from: payload.from,
    to: payload.to,
    pickup_date: payload.pickup_date,
    weight: payload.weight,
    reference: payload.reference,
    issuer: issuerDid,
  });
  return createHash("sha256").update(data).digest("hex");
}
