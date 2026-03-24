import type { IotaEvent } from "@iota/iota-sdk/client";
import type { LoadType, NetworkEventPayload, OrderPayload, OrderState, ProcessType } from "@/domain/types";

export const LOAD_CREATED_EVENT_NAME = "LoadCreatedEvent";
export const LOAD_STATE_CHANGED_EVENT_NAME = "LoadStateChangedEvent";

interface EventScope {
  packageId: string;
  moduleName: string;
}

type UnknownRecord = Record<string, unknown>;

export interface ParsedOnChainNetworkEvent extends NetworkEventPayload {
  loadObjectId: string | null;
  payload: OrderPayload | null;
  fingerprint: string | null;
  previousState: OrderState | null;
}

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function normalizeMoveType(typeName: string): string {
  return typeName.trim().toLowerCase();
}

function readStateCode(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function readInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function parseOptionalString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseOptionalString(item);
      if (parsed) {
        return parsed;
      }
    }
    return null;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  if ("Some" in record) {
    return parseOptionalString(record.Some);
  }

  if ("vec" in record) {
    return parseOptionalString(record.vec);
  }

  if ("id" in record) {
    return parseOptionalString(record.id);
  }

  if ("bytes" in record) {
    return parseOptionalString(record.bytes);
  }

  return null;
}

function parseTimestamp(timestampMs: string | null | undefined): string {
  if (!timestampMs) {
    return new Date().toISOString();
  }

  const value = Number(timestampMs);
  if (Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  const asDate = new Date(timestampMs);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString();
  }

  return new Date().toISOString();
}

function isScopeEvent(typeName: string, scope: EventScope, eventName: string): boolean {
  const normalized = normalizeMoveType(typeName);
  return normalized === normalizeMoveType(`${scope.packageId}::${scope.moduleName}::${eventName}`);
}

function parseOrderId(parsedJson: UnknownRecord): string | null {
  return parseOptionalString(parsedJson.order_id ?? parsedJson.orderId);
}

function parseIssuerDid(parsedJson: UnknownRecord): string {
  return parseOptionalString(parsedJson.issuer_did ?? parsedJson.issuerDid) ?? "";
}

function parseCarrierDid(parsedJson: UnknownRecord): string | null {
  const candidate = parseOptionalString(parsedJson.carrier_did ?? parsedJson.carrierDid);
  return candidate || null;
}

function normalizeProcessType(value: string | null): ProcessType {
  switch (value) {
    case "Tendering":
    case "Auction":
    case "Direct Book":
      return value;
    default:
      return "Tendering";
  }
}

function normalizeLoadType(value: string | null): LoadType {
  switch (value) {
    case "FTL":
    case "LTL":
      return value;
    default:
      return "FTL";
  }
}

function parsePayload(parsedJson: UnknownRecord): OrderPayload | null {
  const from = parseOptionalString(parsedJson.from ?? parsedJson.from_location ?? parsedJson.origin);
  const to = parseOptionalString(parsedJson.to ?? parsedJson.to_location ?? parsedJson.destination);

  if (!from || !to) {
    return null;
  }

  const pickupDate = parseOptionalString(parsedJson.pickup_date ?? parsedJson.pickupDate) ?? "";
  const pickupWindow = parseOptionalString(parsedJson.pickup_window ?? parsedJson.pickupWindow) ?? "";
  const weight = readInteger(parsedJson.weight ?? parsedJson.weight_lbs) ?? 0;
  const reference = parseOptionalString(parsedJson.reference) ?? "";
  const processType = normalizeProcessType(parseOptionalString(parsedJson.process_type ?? parsedJson.processType));
  const loadType = normalizeLoadType(parseOptionalString(parsedJson.load_type ?? parsedJson.loadType));
  const equipmentHash =
    parseOptionalString(
      parsedJson.equipment_requirements_hash ??
        parsedJson.equipmentRequirementsHash ??
        parsedJson.equipment_hash
    ) ?? "";

  return {
    from,
    to,
    pickup_date: pickupDate,
    pickup_window: pickupWindow,
    weight,
    reference,
    process_type: processType,
    load_type: loadType,
    equipment_requirements_hash: equipmentHash,
  };
}

function parseState(parsedJson: UnknownRecord): OrderState | null {
  const stateRaw =
    readStateCode(parsedJson.new_state) ??
    readStateCode(parsedJson.state_code) ??
    readStateCode(parsedJson.state);
  if (stateRaw === null) {
    return null;
  }

  return stateCodeToOrderState(stateRaw);
}

function parsePreviousState(parsedJson: UnknownRecord): OrderState | null {
  const previousState = readStateCode(parsedJson.previous_state ?? parsedJson.previousState);
  if (previousState === null) {
    return null;
  }

  return stateCodeToOrderState(previousState);
}

export function readLoadObjectId(parsedJson: unknown): string | null {
  const record = asRecord(parsedJson);
  if (!record) {
    return null;
  }

  return parseOptionalString(record.load_object_id ?? record.loadObjectId ?? record.load_id ?? record.loadId);
}

export function stateCodeToOrderState(code: number): OrderState | null {
  switch (code) {
    case 0:
      return "PENDING";
    case 1:
      return "BOOKED";
    case 2:
      return "DONE";
    case 3:
      return "CANCELLED";
    case 4:
      return "EXPIRED";
    default:
      return null;
  }
}

export function orderStateToStateCode(state: OrderState): number {
  switch (state) {
    case "PENDING":
      return 0;
    case "BOOKED":
      return 1;
    case "DONE":
      return 2;
    case "CANCELLED":
      return 3;
    case "EXPIRED":
      return 4;
    default:
      return 0;
  }
}

export function buildMoveEventType(scope: EventScope, eventName: string): string {
  return `${scope.packageId}::${scope.moduleName}::${eventName}`;
}

export function parseOnChainNetworkEvent(event: IotaEvent, scope: EventScope): ParsedOnChainNetworkEvent | null {
  if (!event.type) {
    return null;
  }

  const isCreated = isScopeEvent(event.type, scope, LOAD_CREATED_EVENT_NAME);
  const isStateChanged = isScopeEvent(event.type, scope, LOAD_STATE_CHANGED_EVENT_NAME);
  if (!isCreated && !isStateChanged) {
    return null;
  }

  const parsedJson = asRecord(event.parsedJson);
  if (!parsedJson) {
    return null;
  }

  const orderId = parseOrderId(parsedJson);
  if (!orderId) {
    return null;
  }

  const state = parseState(parsedJson);
  if (!state) {
    return null;
  }

  const txDigest = event.id?.txDigest || parseOptionalString(parsedJson.tx_id) || "";
  if (!txDigest) {
    return null;
  }

  const eventSeq = event.id?.eventSeq || "0";

  return {
    event_id: `${txDigest}:${eventSeq}`,
    type: isCreated ? "LOAD_CREATED" : "LOAD_STATE_CHANGED",
    order_id: orderId,
    tx_id: txDigest,
    state,
    issuer_did: parseIssuerDid(parsedJson),
    carrier_did: parseCarrierDid(parsedJson),
    timestamp: parseTimestamp(event.timestampMs ?? parseOptionalString(parsedJson.timestamp_ms)),
    loadObjectId: readLoadObjectId(parsedJson),
    payload: isCreated ? parsePayload(parsedJson) : null,
    fingerprint: parseOptionalString(parsedJson.fingerprint),
    previousState: isStateChanged ? parsePreviousState(parsedJson) : null,
  };
}
