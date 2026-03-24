import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NetworkAdapter } from "@/services/trx/networkAdapter";
import type { NetworkProof, OrderPayload, OrderState, OrderToken, VerificationResult } from "@/domain/types";
import { resetTrxStore } from "@/services/trx/persistentStore";
import { registerProfile } from "@/services/trx/didService";

class FakeNetworkAdapter implements NetworkAdapter {
  private orders = new Map<
    string,
    { state: OrderState; issuer_did: string; carrier_did: string | null; proof: NetworkProof }
  >();
  private txCounter = 0;

  private nextProof(orderId: string, state: OrderState, issuerDid: string, carrierDid?: string | null): NetworkProof {
    this.txCounter++;
    return {
      tx_id: `fake_tx_${this.txCounter}`,
      block_id: `fake_block_${this.txCounter}`,
      timestamp: new Date().toISOString(),
      order_id: orderId,
      state,
      issuer_did: issuerDid,
      carrier_did: carrierDid ?? null,
      verified: true,
    };
  }

  async anchorCreate(orderId: string, _fingerprint: string, issuerDid: string, _payload: OrderPayload): Promise<NetworkProof> {
    const proof = this.nextProof(orderId, "PENDING", issuerDid);
    this.orders.set(orderId, { state: "PENDING", issuer_did: issuerDid, carrier_did: null, proof });
    return proof;
  }

  async anchorUpdate(
    orderId: string,
    newState: OrderState,
    issuerDid: string,
    carrierDid?: string | null,
    _prevProof?: string | null,
  ): Promise<NetworkProof> {
    const proof = this.nextProof(orderId, newState, issuerDid, carrierDid);
    const existing = this.orders.get(orderId);
    if (existing) {
      existing.state = newState;
      existing.carrier_did = carrierDid ?? existing.carrier_did;
      existing.proof = proof;
    }
    return proof;
  }

  async verify(orderId: string): Promise<VerificationResult> {
    const order = this.orders.get(orderId);
    if (!order) {
      return { state: "PENDING", issuer_did: "", carrier_did: null, proof: {} as NetworkProof, verified: false };
    }
    return { state: order.state, issuer_did: order.issuer_did, carrier_did: order.carrier_did, proof: order.proof, verified: true };
  }

  getOrder(orderId: string) {
    return this.orders.get(orderId) ?? null;
  }
}

let fakeAdapter: FakeNetworkAdapter;

vi.mock("@/services/trx/iotaNetworkAdapter", () => ({
  getNetworkAdapter: () => fakeAdapter,
}));

vi.mock("@/services/trx/iotaOnChainConfig", () => ({
  getOnChainWriteReadiness: () => ({ ready: true, code: "READY", message: "Ready" }),
}));

const tokens = new Map<string, OrderToken>();

vi.mock("@/services/trx/iotaOnChainReadModel", () => ({
  getOrderById: vi.fn(async (orderId: string) => tokens.get(orderId) ?? null),
  listOrdersForShipper: vi.fn(async () => []),
  listOrdersForCarrier: vi.fn(async () => ({ pending: [], my_booked: [], my_done: [] })),
}));

import { createOrder, bookOrder, markOrderDone, registerOnboarding, TrxApiError } from "@/services/trx/trxApi";

beforeEach(() => {
  resetTrxStore();
  localStorage.clear();
  fakeAdapter = new FakeNetworkAdapter();
  tokens.clear();
});

describe("Load lifecycle integration", () => {
  async function setupShipper() {
    return registerOnboarding({
      wallet_address: "0xSHIPPER_WALLET",
      role: "SHIPPER",
      company_name: "Shipper Co",
      country: "IT",
      city: "Rome",
      legal_id: "IT12345",
    });
  }

  async function setupCarrier() {
    return registerOnboarding({
      wallet_address: "0xCARRIER_WALLET",
      role: "CARRIER",
      company_name: "Carrier Co",
      country: "IT",
      city: "Milan",
      legal_id: "IT67890",
    });
  }

  async function setupSecondCarrier() {
    return registerOnboarding({
      wallet_address: "0xCARRIER2_WALLET",
      role: "CARRIER",
      company_name: "Carrier 2 Co",
      country: "DE",
      city: "Berlin",
      legal_id: "DE11111",
    });
  }

  describe("Full lifecycle: create → book → done", () => {
    it("completes the full order lifecycle", async () => {
      const shipper = await setupShipper();
      const carrier = await setupCarrier();

      // 1. Create order as shipper
      const { token: createdToken, proof: createProof } = await createOrder(shipper.did, {
        from: "Rome",
        to: "Milan",
        pickup_date: "2025-06-01",
        pickup_window: "08:00-12:00",
        weight: 1000,
        reference: "REF-001",
        process_type: "Tendering",
        load_type: "FTL",
      });

      expect(createdToken.state).toBe("PENDING");
      expect(createdToken.issuer_did).toBe(shipper.did);
      expect(createdToken.carrier_did).toBeNull();
      expect(createProof.verified).toBe(true);
      expect(createProof.tx_id).toContain("fake_tx_");

      // Store in read model mock so bookOrder can find it
      tokens.set(createdToken.order_id, createdToken);

      // 2. Book order as carrier
      const { token: bookedToken, proof: bookProof } = await bookOrder(createdToken.order_id, carrier.did);

      expect(bookedToken.state).toBe("BOOKED");
      expect(bookedToken.carrier_did).toBe(carrier.did);
      expect(bookedToken.issuer_did).toBe(shipper.did);
      expect(bookProof.verified).toBe(true);

      // Update read model mock with booked state
      tokens.set(bookedToken.order_id, bookedToken);

      // 3. Mark order done as carrier
      const { token: doneToken, proof: doneProof } = await markOrderDone(bookedToken.order_id, carrier.did);

      expect(doneToken.state).toBe("DONE");
      expect(doneToken.carrier_did).toBe(carrier.did);
      expect(doneProof.verified).toBe(true);
    });
  });

  describe("Authorization enforcement", () => {
    it("carrier cannot create order (403)", async () => {
      await setupShipper();
      const carrier = await setupCarrier();

      await expect(
        createOrder(carrier.did, {
          from: "Rome",
          to: "Milan",
          weight: 500,
        }),
      ).rejects.toThrow(TrxApiError);

      try {
        await createOrder(carrier.did, { from: "Rome", to: "Milan", weight: 500 });
      } catch (err) {
        expect(err).toBeInstanceOf(TrxApiError);
        expect((err as TrxApiError).status).toBe(403);
      }
    });

    it("shipper cannot book order (403)", async () => {
      const shipper = await setupShipper();
      await setupCarrier();

      const { token } = await createOrder(shipper.did, {
        from: "Rome",
        to: "Milan",
        weight: 500,
      });
      tokens.set(token.order_id, token);

      await expect(bookOrder(token.order_id, shipper.did)).rejects.toThrow(TrxApiError);

      try {
        await bookOrder(token.order_id, shipper.did);
      } catch (err) {
        expect(err).toBeInstanceOf(TrxApiError);
        expect((err as TrxApiError).status).toBe(403);
      }
    });

    it("different carrier cannot markDone on another carrier's booking (403)", async () => {
      const shipper = await setupShipper();
      const carrier = await setupCarrier();
      const carrier2 = await setupSecondCarrier();

      const { token: createdToken } = await createOrder(shipper.did, {
        from: "Rome",
        to: "Milan",
        weight: 500,
      });
      tokens.set(createdToken.order_id, createdToken);

      const { token: bookedToken } = await bookOrder(createdToken.order_id, carrier.did);
      tokens.set(bookedToken.order_id, bookedToken);

      await expect(markOrderDone(bookedToken.order_id, carrier2.did)).rejects.toThrow(TrxApiError);

      try {
        await markOrderDone(bookedToken.order_id, carrier2.did);
      } catch (err) {
        expect(err).toBeInstanceOf(TrxApiError);
        expect((err as TrxApiError).status).toBe(403);
      }
    });
  });

  describe("State transition enforcement", () => {
    it("cannot book an already-BOOKED order (409)", async () => {
      const shipper = await setupShipper();
      const carrier = await setupCarrier();
      const carrier2 = await setupSecondCarrier();

      const { token: createdToken } = await createOrder(shipper.did, {
        from: "Rome",
        to: "Milan",
        weight: 500,
      });
      tokens.set(createdToken.order_id, createdToken);

      const { token: bookedToken } = await bookOrder(createdToken.order_id, carrier.did);
      tokens.set(bookedToken.order_id, bookedToken);

      await expect(bookOrder(bookedToken.order_id, carrier2.did)).rejects.toThrow(TrxApiError);

      try {
        await bookOrder(bookedToken.order_id, carrier2.did);
      } catch (err) {
        expect(err).toBeInstanceOf(TrxApiError);
        expect((err as TrxApiError).status).toBe(409);
      }
    });
  });
});
