// ── State machine: pure functions for transitions and authorization ──

import { Actor, OrderState, OrderToken } from "./types";

/** Valid state transitions map */
const TRANSITIONS: Record<OrderState, OrderState[]> = {
  PENDING: ["BOOKED", "CANCELLED", "EXPIRED"],
  BOOKED: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
  EXPIRED: [],
};

/** Check if a state transition is structurally valid */
export function canTransition(
  currentState: OrderState,
  nextState: OrderState
): boolean {
  return TRANSITIONS[currentState]?.includes(nextState) ?? false;
}

/**
 * Check if an actor can perform a specific transition on a token.
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export function canActorPerformTransition(
  actor: Actor,
  token: OrderToken,
  nextState: OrderState
): { allowed: true } | { allowed: false; reason: string } {
  // 1. Check structural validity
  if (!canTransition(token.state, nextState)) {
    return {
      allowed: false,
      reason: `Invalid transition: ${token.state} -> ${nextState}`,
    };
  }

  // 2. Check role-based authorization per transition
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
      if (actor.role !== "SHIPPER") {
        return { allowed: false, reason: "Only SHIPPER can cancel a load" };
      }
      if (token.issuer_did !== actor.did) {
        return {
          allowed: false,
          reason: "Only the issuing shipper can cancel this load",
        };
      }
      if (token.state !== "PENDING") {
        return {
          allowed: false,
          reason: "Can only cancel loads in PENDING state",
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: false, reason: `Unsupported transition to ${nextState}` };
  }
}

/**
 * Check if an actor can create (publish) a new load.
 */
export function canActorCreate(actor: Actor): { allowed: true } | { allowed: false; reason: string } {
  if (actor.role !== "SHIPPER") {
    return { allowed: false, reason: "Only SHIPPER can create loads" };
  }
  return { allowed: true };
}
