import { IotaClient, type EventId, type IotaTransactionBlockResponse } from "@iota/iota-sdk/client";
import { Transaction } from "@iota/iota-sdk/transactions";
import { signAndExecuteTransaction, type Wallet } from "@iota/wallet-standard";
import type { NetworkProof, OrderPayload, OrderState, VerificationResult } from "@/domain/types";
import { assertOnChainWriteReady, getIotaOnChainConfig } from "@/services/trx/iotaOnChainConfig";
import { parseOnChainNetworkEvent, orderStateToStateCode, type ParsedOnChainNetworkEvent } from "@/services/trx/iotaOnChainEvents";
import { publishNetworkEvent } from "@/services/trx/networkEvents";
import type { NetworkAdapter } from "@/services/trx/networkAdapter";
import { getIotaWalletService } from "@/services/wallet/iotaWallet";

interface OnChainScope {
  packageId: string;
  moduleName: string;
}

interface WalletSession {
  wallet: Wallet;
  account: unknown;
  chain: string;
}

const SEARCH_PAGE_SIZE = 50;
const SEARCH_MAX_PAGES = 10;
const WAIT_TX_TIMEOUT_MS = 30_000;
const WAIT_TX_POLL_MS = 1_200;

let cachedClient: IotaClient | null = null;
let cachedClientUrl = "";

function getClient(url: string): IotaClient {
  if (!cachedClient || cachedClientUrl !== url) {
    cachedClient = new IotaClient({ url });
    cachedClientUrl = url;
  }

  return cachedClient;
}

function normalizeIsoTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  return new Date().toISOString();
}

function createUnverifiedResult(orderId: string): VerificationResult {
  return {
    state: "PENDING",
    issuer_did: "",
    carrier_did: null,
    proof: {
      tx_id: "",
      block_id: "",
      timestamp: "",
      order_id: orderId,
      state: "PENDING",
      issuer_did: "",
      carrier_did: null,
      verified: false,
    },
    verified: false,
  };
}

export class IotaOnChainAdapter implements NetworkAdapter {
  private readonly loadObjectIdByOrder = new Map<string, string>();

  private resolveScope(): OnChainScope | null {
    const config = getIotaOnChainConfig();
    if (!config.packageId) {
      return null;
    }

    return {
      packageId: config.packageId,
      moduleName: config.moduleName,
    };
  }

  private requireScope(): OnChainScope {
    const scope = this.resolveScope();
    if (!scope) {
      throw new Error("On-chain setup incomplete: VITE_IOTA_TRX_PACKAGE_ID is required.");
    }

    return scope;
  }

  private getClient(): IotaClient {
    return getClient(getIotaOnChainConfig().fullnodeUrl);
  }

  isConfigured(): boolean {
    return Boolean(getIotaOnChainConfig().packageId);
  }

  canSubmitTransactions(): boolean {
    return getIotaWalletService().hasWalletStandardTransactionSupport() && this.isConfigured();
  }

  private requireWalletSession(): WalletSession {
    const session = getIotaWalletService().getWalletStandardSession();
    if (!session) {
      throw new Error("Wallet Standard session is not ready for signing transactions");
    }

    return session;
  }

  private async executeMoveCall(
    target: string,
    build: (tx: Transaction) => void
  ): Promise<{ digest: string; tx: IotaTransactionBlockResponse; event: ParsedOnChainNetworkEvent | null }> {
    const session = this.requireWalletSession();
    const tx = new Transaction();
    build(tx);

    const execution = await signAndExecuteTransaction(session.wallet, {
      transaction: tx,
      account: session.account as never,
      chain: session.chain as `${string}:${string}`,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    const digest = execution.digest;
    const transaction = await this.waitForTransaction(digest);
    const scope = this.requireScope();
    const event = await this.resolveEventFromDigest(digest, scope);

    if (import.meta.env.DEV) {
      console.info("[iota-onchain] executed", {
        target,
        digest,
        hasEvent: Boolean(event),
      });
    }

    return {
      digest,
      tx: transaction,
      event,
    };
  }

  private async waitForTransaction(digest: string): Promise<IotaTransactionBlockResponse> {
    const client = this.getClient();
    try {
      return await client.waitForTransaction({
        digest,
        waitMode: "indexed-on-node",
        timeout: WAIT_TX_TIMEOUT_MS,
        pollInterval: WAIT_TX_POLL_MS,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
    } catch {
      return client.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
    }
  }

  private async resolveEventFromDigest(digest: string, scope: OnChainScope): Promise<ParsedOnChainNetworkEvent | null> {
    const tx = await this.waitForTransaction(digest);
    const txEvents = tx.events ?? [];
    for (const event of txEvents) {
      const parsed = parseOnChainNetworkEvent(event, scope);
      if (parsed) {
        return parsed;
      }
    }

    const page = await this.getClient().queryEvents({
      query: { Transaction: digest },
      limit: SEARCH_PAGE_SIZE,
      order: "ascending",
    });

    for (const event of page.data) {
      const parsed = parseOnChainNetworkEvent(event, scope);
      if (parsed) {
        return parsed;
      }
    }

    return null;
  }

  private buildProof(orderId: string, event: ParsedOnChainNetworkEvent, checkpoint: string | null): NetworkProof {
    return {
      tx_id: event.tx_id,
      block_id: checkpoint || event.tx_id,
      timestamp: normalizeIsoTimestamp(event.timestamp),
      order_id: orderId,
      state: event.state,
      issuer_did: event.issuer_did,
      carrier_did: event.carrier_did,
      verified: true,
    };
  }

  private async findLatestEvent(orderId: string): Promise<ParsedOnChainNetworkEvent | null> {
    const scope = this.resolveScope();
    if (!scope) {
      return null;
    }

    const client = this.getClient();

    let cursor: EventId | null | undefined = null;
    for (let pageIndex = 0; pageIndex < SEARCH_MAX_PAGES; pageIndex += 1) {
      const page = await client.queryEvents({
        query: {
          MoveModule: {
            package: scope.packageId,
            module: scope.moduleName,
          },
        },
        cursor,
        limit: SEARCH_PAGE_SIZE,
        order: "descending",
      });

      for (const event of page.data) {
        const parsed = parseOnChainNetworkEvent(event, scope);
        if (parsed?.order_id === orderId) {
          return parsed;
        }
      }

      if (!page.hasNextPage || !page.nextCursor) {
        return null;
      }

      cursor = page.nextCursor;
    }

    return null;
  }

  private async resolveLoadObjectId(orderId: string): Promise<string | null> {
    const cached = this.loadObjectIdByOrder.get(orderId);
    if (cached) {
      return cached;
    }

    const latestEvent = await this.findLatestEvent(orderId);
    if (!latestEvent?.loadObjectId) {
      return null;
    }

    this.loadObjectIdByOrder.set(orderId, latestEvent.loadObjectId);
    return latestEvent.loadObjectId;
  }

  async anchorCreate(
    orderId: string,
    fingerprint: string,
    issuerDid: string,
    payload: OrderPayload
  ): Promise<NetworkProof> {
    assertOnChainWriteReady();

    const scope = this.requireScope();
    const target = `${scope.packageId}::${scope.moduleName}::create_load`;

    const result = await this.executeMoveCall(target, (tx) => {
      tx.moveCall({
        target,
        arguments: [
          tx.pure.string(orderId),
          tx.pure.string(fingerprint),
          tx.pure.string(issuerDid),
          tx.pure.string(payload.from),
          tx.pure.string(payload.to),
          tx.pure.string(payload.pickup_date),
          tx.pure.string(payload.pickup_window),
          tx.pure.u64(Math.max(0, Math.trunc(payload.weight))),
          tx.pure.string(payload.reference),
          tx.pure.string(payload.process_type),
          tx.pure.string(payload.load_type),
          tx.pure.string(payload.equipment_requirements_hash),
        ],
      });
    });

    const event = result.event;
    if (!event) {
      throw new Error("On-chain create transaction completed but no load event was found");
    }
    if (event.order_id !== orderId || event.type !== "LOAD_CREATED") {
      throw new Error("On-chain create transaction returned an unexpected event payload");
    }

    if (event.loadObjectId) {
      this.loadObjectIdByOrder.set(orderId, event.loadObjectId);
    }

    const proof = this.buildProof(orderId, event, result.tx.checkpoint ?? null);
    publishNetworkEvent(event);
    return proof;
  }

  async anchorUpdate(
    orderId: string,
    newState: OrderState,
    issuerDid: string,
    carrierDid?: string | null,
    prevProof?: string | null
  ): Promise<NetworkProof> {
    assertOnChainWriteReady();

    const scope = this.requireScope();
    const loadObjectId = await this.resolveLoadObjectId(orderId);
    if (!loadObjectId) {
      throw new Error("Unable to resolve on-chain load object id for this order");
    }

    const target = `${scope.packageId}::${scope.moduleName}::update_load_state`;
    const result = await this.executeMoveCall(target, (tx) => {
      tx.moveCall({
        target,
        arguments: [
          tx.object(loadObjectId),
          tx.pure.u8(orderStateToStateCode(newState)),
          tx.pure.string(issuerDid),
          tx.pure.string(carrierDid ?? ""),
          tx.pure.string(prevProof ?? ""),
        ],
      });
    });

    const event = result.event;
    if (!event) {
      throw new Error("On-chain state update completed but no load event was found");
    }
    if (event.order_id !== orderId || event.type !== "LOAD_STATE_CHANGED") {
      throw new Error("On-chain state update transaction returned an unexpected event payload");
    }

    if (event.loadObjectId) {
      this.loadObjectIdByOrder.set(orderId, event.loadObjectId);
    }

    const proof = this.buildProof(orderId, event, result.tx.checkpoint ?? null);
    publishNetworkEvent(event);
    return proof;
  }

  async verify(orderId: string): Promise<VerificationResult> {
    if (!this.isConfigured()) {
      return createUnverifiedResult(orderId);
    }

    try {
      const latestEvent = await this.findLatestEvent(orderId);
      if (!latestEvent) {
        return createUnverifiedResult(orderId);
      }

      if (latestEvent.loadObjectId) {
        this.loadObjectIdByOrder.set(orderId, latestEvent.loadObjectId);
      }

      const proof: NetworkProof = {
        tx_id: latestEvent.tx_id,
        block_id: latestEvent.tx_id,
        timestamp: normalizeIsoTimestamp(latestEvent.timestamp),
        order_id: orderId,
        state: latestEvent.state,
        issuer_did: latestEvent.issuer_did,
        carrier_did: latestEvent.carrier_did,
        verified: true,
      };

      return {
        state: proof.state,
        issuer_did: proof.issuer_did,
        carrier_did: proof.carrier_did,
        proof,
        verified: true,
      };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[iota-onchain] verify failed", error);
      }
      return createUnverifiedResult(orderId);
    }
  }

  async latestEventCursor(): Promise<EventId | null> {
    const scope = this.resolveScope();
    if (!scope) {
      return null;
    }

    const page = await this.getClient().queryEvents({
      query: {
        MoveModule: {
          package: scope.packageId,
          module: scope.moduleName,
        },
      },
      limit: 1,
      order: "descending",
    });

    return page.data[0]?.id ?? null;
  }

  async getEventsAfter(cursor: EventId | null): Promise<{ events: ParsedOnChainNetworkEvent[]; cursor: EventId | null }> {
    const scope = this.resolveScope();
    if (!scope) {
      return { events: [], cursor: null };
    }

    const client = this.getClient();

    let nextCursor = cursor;
    const events: ParsedOnChainNetworkEvent[] = [];

    let hasNext = true;
    while (hasNext) {
      const page = await client.queryEvents({
        query: {
          MoveModule: {
            package: scope.packageId,
            module: scope.moduleName,
          },
        },
        cursor: nextCursor,
        limit: SEARCH_PAGE_SIZE,
        order: "ascending",
      });

      for (const rawEvent of page.data) {
        const parsed = parseOnChainNetworkEvent(rawEvent, scope);
        if (parsed) {
          events.push(parsed);
        }
      }

      if (page.data.length > 0) {
        nextCursor = page.data[page.data.length - 1].id;
      } else if (page.nextCursor) {
        nextCursor = page.nextCursor;
      }

      hasNext = Boolean(page.hasNextPage && page.nextCursor);
      if (hasNext) {
        nextCursor = page.nextCursor ?? null;
      }
    }

    return { events, cursor: nextCursor ?? null };
  }
}
