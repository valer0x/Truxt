import { IotaClient } from "@iota/iota-sdk/client";
import type { NetworkProof, OrderPayload, OrderToken, VerifiedOrderRow } from "@/domain/types";
import { getIotaOnChainConfig } from "@/services/trx/iotaOnChainConfig";
import { parseOnChainNetworkEvent, type ParsedOnChainNetworkEvent } from "@/services/trx/iotaOnChainEvents";

const PAGE_SIZE = 100;
const CACHE_TTL_MS = 4_000;

interface OnChainOrderSnapshot extends VerifiedOrderRow {
  load_object_id: string | null;
}

interface ReadModelCache {
  orders: Map<string, OnChainOrderSnapshot>;
  builtAt: number;
  dirty: boolean;
}

let cachedClient: IotaClient | null = null;
let cachedClientUrl = "";
let listenerInstalled = false;

const txBlockCache = new Map<string, string>();
const readModelCache: ReadModelCache = {
  orders: new Map<string, OnChainOrderSnapshot>(),
  builtAt: 0,
  dirty: true,
};

function getClient(url: string): IotaClient {
  if (!cachedClient || cachedClientUrl !== url) {
    cachedClient = new IotaClient({ url });
    cachedClientUrl = url;
  }

  return cachedClient;
}

function normalizeTimestamp(raw: string): string {
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}

function fallbackPayload(): OrderPayload {
  return {
    from: "-",
    to: "-",
    pickup_date: "",
    pickup_window: "",
    weight: 0,
    reference: "",
    process_type: "Tendering",
    load_type: "FTL",
    equipment_requirements_hash: "",
  };
}

function buildProof(orderId: string, event: ParsedOnChainNetworkEvent, blockId: string): NetworkProof {
  return {
    tx_id: event.tx_id,
    block_id: blockId,
    timestamp: normalizeTimestamp(event.timestamp),
    order_id: orderId,
    state: event.state,
    issuer_did: event.issuer_did,
    carrier_did: event.carrier_did,
    verified: true,
  };
}

async function resolveBlockId(client: IotaClient, txDigest: string): Promise<string> {
  const cached = txBlockCache.get(txDigest);
  if (cached) {
    return cached;
  }

  try {
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: false,
        showEvents: false,
        showInput: false,
        showObjectChanges: false,
        showBalanceChanges: false,
      },
    });

    const blockId = tx.checkpoint || txDigest;
    txBlockCache.set(txDigest, blockId);
    return blockId;
  } catch {
    txBlockCache.set(txDigest, txDigest);
    return txDigest;
  }
}

function ensureListener(): void {
  if (listenerInstalled || typeof window === "undefined") {
    return;
  }

  window.addEventListener("trx:network-event", () => {
    readModelCache.dirty = true;
  });

  listenerInstalled = true;
}

function toOrderToken(snapshot: OnChainOrderSnapshot): OrderToken {
  return {
    order_id: snapshot.order_id,
    issuer_did: snapshot.issuer_did,
    carrier_did: snapshot.carrier_did,
    state: snapshot.state,
    payload_offledger: { ...snapshot.payload_offledger },
    fingerprint: snapshot.fingerprint,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
    last_network_proof: snapshot.last_network_proof,
    last_verified_at: snapshot.last_verified_at,
  };
}

function toVerifiedOrderRow(snapshot: OnChainOrderSnapshot): VerifiedOrderRow {
  return {
    ...toOrderToken(snapshot),
    verified_state: snapshot.verified_state,
    verified: snapshot.verified,
    verified_proof: { ...snapshot.verified_proof },
  };
}

async function applyEvent(
  event: ParsedOnChainNetworkEvent,
  current: OnChainOrderSnapshot | undefined,
  client: IotaClient
): Promise<OnChainOrderSnapshot> {
  const blockId = await resolveBlockId(client, event.tx_id);
  const proof = buildProof(event.order_id, event, blockId);

  if (event.type === "LOAD_CREATED") {
    return {
      order_id: event.order_id,
      issuer_did: event.issuer_did,
      carrier_did: event.carrier_did,
      state: event.state,
      payload_offledger: event.payload ? { ...event.payload } : fallbackPayload(),
      fingerprint: event.fingerprint ?? current?.fingerprint ?? "",
      created_at: normalizeTimestamp(event.timestamp),
      updated_at: normalizeTimestamp(event.timestamp),
      last_network_proof: event.tx_id,
      last_verified_at: normalizeTimestamp(event.timestamp),
      verified_state: event.state,
      verified: true,
      verified_proof: proof,
      load_object_id: event.loadObjectId ?? current?.load_object_id ?? null,
    };
  }

  if (!current) {
    return {
      order_id: event.order_id,
      issuer_did: event.issuer_did,
      carrier_did: event.carrier_did,
      state: event.state,
      payload_offledger: fallbackPayload(),
      fingerprint: event.fingerprint ?? "",
      created_at: normalizeTimestamp(event.timestamp),
      updated_at: normalizeTimestamp(event.timestamp),
      last_network_proof: event.tx_id,
      last_verified_at: normalizeTimestamp(event.timestamp),
      verified_state: event.state,
      verified: true,
      verified_proof: proof,
      load_object_id: event.loadObjectId,
    };
  }

  return {
    ...current,
    state: event.state,
    issuer_did: event.issuer_did || current.issuer_did,
    carrier_did: event.carrier_did,
    updated_at: normalizeTimestamp(event.timestamp),
    last_network_proof: event.tx_id,
    last_verified_at: normalizeTimestamp(event.timestamp),
    verified_state: event.state,
    verified: true,
    verified_proof: proof,
    load_object_id: event.loadObjectId ?? current.load_object_id,
  };
}

async function rebuildCache(): Promise<void> {
  ensureListener();

  const config = getIotaOnChainConfig();
  if (!config.packageId) {
    readModelCache.orders = new Map<string, OnChainOrderSnapshot>();
    readModelCache.builtAt = Date.now();
    readModelCache.dirty = false;
    return;
  }

  const client = getClient(config.fullnodeUrl);
  const nextOrders = new Map<string, OnChainOrderSnapshot>();

  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await client.queryEvents({
      query: {
        MoveModule: {
          package: config.packageId,
          module: config.moduleName,
        },
      },
      cursor,
      limit: PAGE_SIZE,
      order: "ascending",
    });

    for (const rawEvent of page.data) {
      const parsed = parseOnChainNetworkEvent(rawEvent, {
        packageId: config.packageId,
        moduleName: config.moduleName,
      });

      if (!parsed) {
        continue;
      }

      const current = nextOrders.get(parsed.order_id);
      const updated = await applyEvent(parsed, current, client);
      nextOrders.set(parsed.order_id, updated);
    }

    hasNextPage = Boolean(page.hasNextPage && page.nextCursor);
    cursor = hasNextPage ? page.nextCursor : null;
  }

  readModelCache.orders = nextOrders;
  readModelCache.builtAt = Date.now();
  readModelCache.dirty = false;
}

async function ensureFreshCache(): Promise<void> {
  const stale = Date.now() - readModelCache.builtAt > CACHE_TTL_MS;
  if (!readModelCache.dirty && !stale) {
    return;
  }

  await rebuildCache();
}

function sortByUpdatedDateDesc(rows: OnChainOrderSnapshot[]): OnChainOrderSnapshot[] {
  return rows.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export function invalidateOnChainReadModelCache(): void {
  readModelCache.dirty = true;
}

export async function getOrderById(orderId: string): Promise<OrderToken | null> {
  await ensureFreshCache();
  const snapshot = readModelCache.orders.get(orderId);
  if (!snapshot) {
    return null;
  }

  return toOrderToken(snapshot);
}

export async function listOrdersForShipper(issuerDid: string): Promise<VerifiedOrderRow[]> {
  await ensureFreshCache();

  const rows = [...readModelCache.orders.values()].filter((row) => row.issuer_did === issuerDid);
  return sortByUpdatedDateDesc(rows).map((row) => toVerifiedOrderRow(row));
}

export async function listOrdersForCarrier(carrierDid: string): Promise<{
  pending: VerifiedOrderRow[];
  my_booked: VerifiedOrderRow[];
  my_done: VerifiedOrderRow[];
}> {
  await ensureFreshCache();

  const rows = sortByUpdatedDateDesc([...readModelCache.orders.values()]);

  const pending = rows.filter((row) => row.verified_state === "PENDING").map((row) => toVerifiedOrderRow(row));
  const myBooked = rows
    .filter((row) => row.carrier_did === carrierDid && row.verified_state === "BOOKED")
    .map((row) => toVerifiedOrderRow(row));
  const myDone = rows
    .filter((row) => row.carrier_did === carrierDid && row.verified_state === "DONE")
    .map((row) => toVerifiedOrderRow(row));

  return {
    pending,
    my_booked: myBooked,
    my_done: myDone,
  };
}
