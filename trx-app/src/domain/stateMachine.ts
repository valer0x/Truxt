import type { Actor, OrderState, OrderToken } from "@/domain/types";

/**
 * Valid lifecycle transitions per white paper Section IV.
 * Every entry here must be mirrored in the Move contract's is_valid_transition().
 */
const TRANSITIONS: Record<OrderState, OrderState[]> = {
  PENDING: ["BOOKED", "CANCELLED", "EXPIRED"],
  BOOKED: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(currentState: OrderState, nextState: OrderState): boolean {
  return TRANSITIONS[currentState]?.includes(nextState) ?? false;
}

/**
 * Authorization rules for actor-driven state transitions.
 *
 * All five transitions defined in the lifecycle model (WP Section IV) are reachable.
 *
 *   PENDING  → BOOKED    — CARRIER only (any carrier, unless already booked by another)
 *   PENDING  → CANCELLED — SHIPPER (issuer) only
 *   PENDING  → EXPIRED   — SHIPPER (issuer) only [see EXPIRED note below]
 *   BOOKED   → DONE      — CARRIER who booked (carrier_did match required)
 *   BOOKED   → CANCELLED — SHIPPER (issuer) only
 *
 * NOTE on EXPIRED (temporary implementation):
 *   In production, PENDING→EXPIRED should be triggered by an automated time-based
 *   scheduler with no human actor. Until that mechanism exists, the issuing SHIPPER
 *   is authorized to expire their own PENDING load manually. This rule is explicitly
 *   documented here so it is not confused with a permanent design decision.
 */
export function canActorPerformTransition(
  actor: Actor,
  token: OrderToken,
  nextState: OrderState
): { allowed: true } | { allowed: false; reason: string } {
  if (!canTransition(token.state, nextState)) {
    return {
      allowed: false,
      reason: `Invalid transition: ${token.state} -> ${nextState}`,
    };
  }

  switch (nextState) {
    case "BOOKED": {
      if (actor.role !== "CARRIER") {
        return { allowed: false, reason: "Only CARRIER can book a load" };
      }
      if (token.carrier_did && token.carrier_did !== actor.did) {
        return {
          allowed: false,
          reason: "Load is already booked by another carrier",
        };
      }
      return { allowed: true };
    }

    case "DONE": {
      if (actor.role !== "CARRIER") {
        return {
          allowed: false,
          reason: "Only CARRIER can mark a load as done",
        };
      }
      if (token.carrier_did !== actor.did) {
        return {
          allowed: false,
          reason: "Only the carrier who booked this load can mark it as done",
        };
      }
      return { allowed: true };
    }

    case "CANCELLED": {
      // Both PENDING→CANCELLED and BOOKED→CANCELLED are valid per lifecycle model (WP Section IV).
      // Authorization: only the issuing SHIPPER may cancel, regardless of current state.
      if (actor.role !== "SHIPPER") {
        return { allowed: false, reason: "Only SHIPPER can cancel a load" };
      }
      if (token.issuer_did !== actor.did) {
        return {
          allowed: false,
          reason: "Only the issuing shipper can cancel this load",
        };
      }
      return { allowed: true };
    }

    case "EXPIRED": {
      // PENDING→EXPIRED is valid per lifecycle model (WP Section IV).
      // TEMPORARY RULE: the issuing SHIPPER may expire a PENDING load manually.
      // Replace with a system-actor rule when an automated expiry scheduler is introduced.
      if (actor.role !== "SHIPPER") {
        return { allowed: false, reason: "Only SHIPPER can expire a load" };
      }
      if (token.issuer_did !== actor.did) {
        return {
          allowed: false,
          reason: "Only the issuing shipper can expire this load",
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: false, reason: `Unsupported transition to ${nextState}` };
  }
}

export function canActorCreate(actor: Actor): { allowed: true } | { allowed: false; reason: string } {
  if (actor.role !== "SHIPPER") {
    return { allowed: false, reason: "Only SHIPPER can create loads" };
  }

  return { allowed: true };
}
