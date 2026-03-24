import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NetworkAdapter } from "@/services/trx/networkAdapter";
import type { NetworkProof, OrderPayload, OrderToken, VerificationResult } from "@/domain/types";

const mockAdapter: NetworkAdapter = {
  anchorCreate: vi.fn(),
  anchorUpdate: vi.fn(),
  verify: vi.fn(),
};

vi.mock("@/services/trx/iotaNetworkAdapter", () => ({
  getNetworkAdapter: () => mockAdapter,
}));

vi.mock("@/services/trx/iotaOnChainConfig", () => ({
  getOnChainWriteReadiness: vi.fn(() => ({ ready: true, code: "READY", message: "Ready" })),
}));

vi.mock("@/services/trx/iotaOnChainReadModel", () => ({
  getOrderById: vi.fn(),
  listOrdersForShipper: vi.fn(() => []),
  listOrdersForCarrier: vi.fn(() => ({ pending: [], my_booked: [], my_done: [] })),
}));

const didProfiles = new Map<string, any>();

vi.mock("@/services/trx/didService", () => ({
  lookupByWallet: vi.fn((addr: string) => didProfiles.get(`wallet:${addr}`) ?? null),
  lookupByDid: vi.fn((did: string) => didProfiles.get(`did:${did}`) ?? null),
  registerProfile: vi.fn(async (data: any) => {
    const existing = didProfiles.get(`wallet:${data.wallet_address}`);
    if (existing) {
      throw new Error("Wallet already registered");
    }
    const profile = {
      ...data,
      did: `did:iota:test_${data.wallet_address}`,
      legal_id_hash: "hashed",
      load_id_standard: data.load_id_standard ?? null,
    };
    delete (profile as any).legal_id;
    didProfiles.set(`wallet:${data.wallet_address}`, profile);
    didProfiles.set(`did:${profile.did}`, profile);
    return profile;
  }),
}));

import {
  connectWalletAuth,
  registerOnboarding,
  createOrder,
  bookOrder,
  markOrderDone,
  listOrders,
  TrxApiError,
} from "@/services/trx/trxApi";
import { getOnChainWriteReadiness } from "@/services/trx/iotaOnChainConfig";
import { getOrderById } from "@/services/trx/iotaOnChainReadModel";

function mockProof(orderId: string, state = "PENDING"): NetworkProof {
  return {
    tx_id: "tx_test_001",
    block_id: "block_test_001",
    timestamp: "2025-01-15T00:00:00.000Z",
    order_id: orderId,
    state: state as any,
    issuer_did: "did:iota:test_shipper1",
    carrier_did: null,
    verified: true,
  };
}

function mockVerification(
  state: string,
  verified = true,
  carrierDid: string | null = null
): VerificationResult {
  return {
    state: state as any,
    issuer_did: "did:iota:test_shipper1",
    carrier_did: carrierDid,
    proof: mockProof("ORD-test", state),
    verified,
  };
}

function seedShipper(wallet = "shipper1", did = "did:iota:test_shipper1") {
  const profile = {
    wallet_address: wallet,
    did,
    role: "SHIPPER" as const,
    company_name: "Shipper Corp",
    country: "Italy",
    city: "Rome",
    legal_id_hash: "hashed",
    load_id_standard: null,
  };
  didProfiles.set(`wallet:${wallet}`, profile);
  didProfiles.set(`did:${did}`, profile);
  return profile;
}

function seedCarrier(wallet = "carrier1", did = "did:iota:test_carrier1") {
  const profile = {
    wallet_address: wallet,
    did,
    role: "CARRIER" as const,
    company_name: "Carrier Corp",
    country: "Germany",
    city: "Berlin",
    legal_id_hash: "hashed",
    load_id_standard: null,
  };
  didProfiles.set(`wallet:${wallet}`, profile);
  didProfiles.set(`did:${did}`, profile);
  return profile;
}

function makePendingToken(orderId: string, issuerDid: string): OrderToken {
  return {
    order_id: orderId,
    issuer_did: issuerDid,
    carrier_did: null,
    state: "PENDING",
    payload_offledger: {
      from: "Milan",
      to: "Rome",
      pickup_date: "2025-01-20",
      pickup_window: "08:00-12:00",
      weight: 1000,
      reference: "REF-001",
      process_type: "Tendering",
      load_type: "FTL",
      equipment_requirements_hash: "abc123",
    },
    fingerprint: "fp_test",
    created_at: "2025-01-15T00:00:00.000Z",
    updated_at: "2025-01-15T00:00:00.000Z",
    last_network_proof: "tx_test_001",
    last_verified_at: "2025-01-15T00:00:00.000Z",
  };
}

function makeBookedToken(orderId: string, issuerDid: string, carrierDid: string): OrderToken {
  return {
    ...makePendingToken(orderId, issuerDid),
    state: "BOOKED",
    carrier_did: carrierDid,
  };
}

beforeEach(() => {
  didProfiles.clear();
  vi.mocked(mockAdapter.anchorCreate).mockReset();
  vi.mocked(mockAdapter.anchorUpdate).mockReset();
  vi.mocked(mockAdapter.verify).mockReset();
  vi.mocked(getOnChainWriteReadiness).mockReturnValue({
    ready: true,
    code: "READY",
    message: "Ready",
  });
  vi.mocked(getOrderById).mockReset();
});

describe("connectWalletAuth", () => {
  it("throws TrxApiError 400 for empty wallet address", async () => {
    await expect(connectWalletAuth("")).rejects.toThrow(TrxApiError);
    await expect(connectWalletAuth("")).rejects.toThrow("wallet_address is required");
    try {
      await connectWalletAuth("   ");
    } catch (err) {
      expect(err).toBeInstanceOf(TrxApiError);
      expect((err as TrxApiError).status).toBe(400);
    }
  });

  it("returns registered: false for unregistered wallet", async () => {
    const result = await connectWalletAuth("0xUnknown");
    expect(result).toEqual({ registered: false, redirect: "/onboarding" });
  });

  it("returns registered: true with profile for registered wallet", async () => {
    const profile = seedShipper("0xShipper");
    const result = await connectWalletAuth("0xShipper");
    expect(result).toEqual({
      registered: true,
      role: "SHIPPER",
      did: profile.did,
      profile,
      redirect: "/dashboard",
    });
  });
});

describe("registerOnboarding", () => {
  const validData = {
    wallet_address: "0xNew",
    role: "SHIPPER" as const,
    company_name: "Test Corp",
    country: "Italy",
    city: "Milan",
    legal_id: "IT12345",
  };

  it("throws 400 for empty wallet_address", async () => {
    await expect(
      registerOnboarding({ ...validData, wallet_address: "" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for invalid role", async () => {
    await expect(
      registerOnboarding({ ...validData, role: "ADMIN" as any })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for missing company_name", async () => {
    await expect(
      registerOnboarding({ ...validData, company_name: "" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for missing country", async () => {
    await expect(
      registerOnboarding({ ...validData, country: "" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for missing city", async () => {
    await expect(
      registerOnboarding({ ...validData, city: "" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws 400 for missing legal_id", async () => {
    await expect(
      registerOnboarding({ ...validData, legal_id: "" })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns DIDProfile on successful registration", async () => {
    const result = await registerOnboarding(validData);
    expect(result).toMatchObject({
      wallet_address: "0xNew",
      role: "SHIPPER",
      company_name: "Test Corp",
      did: expect.stringContaining("did:iota:"),
    });
  });

  it("throws 409 for duplicate wallet", async () => {
    await registerOnboarding(validData);
    await expect(registerOnboarding(validData)).rejects.toMatchObject({ status: 409 });
  });
});

describe("createOrder", () => {
  const payload: Partial<OrderPayload> = {
    from: "Milan",
    to: "Rome",
    pickup_date: "2025-02-01",
    weight: 500,
  };

  it("throws 503 when on-chain not ready", async () => {
    vi.mocked(getOnChainWriteReadiness).mockReturnValue({
      ready: false,
      code: "MISSING_PACKAGE",
      message: "Package missing",
    });
    seedShipper();

    await expect(createOrder("did:iota:test_shipper1", payload)).rejects.toMatchObject({
      status: 503,
    });
  });

  it("throws 403 when actor is CARRIER", async () => {
    seedCarrier();
    await expect(createOrder("did:iota:test_carrier1", payload)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws 401 when actor DID not found", async () => {
    await expect(createOrder("did:iota:nonexistent", payload)).rejects.toMatchObject({
      status: 401,
    });
  });

  it("returns token and proof on success", async () => {
    const shipper = seedShipper();
    const proof = mockProof("ORD-new");
    vi.mocked(mockAdapter.anchorCreate).mockResolvedValue(proof);

    const result = await createOrder(shipper.did, payload);

    expect(result.token).toMatchObject({
      issuer_did: shipper.did,
      carrier_did: null,
      state: "PENDING",
    });
    expect(result.token.order_id).toBeTruthy();
    expect(result.token.fingerprint).toBeTruthy();
    expect(result.proof).toBe(proof);
  });

  it("calls adapter.anchorCreate with correct arguments", async () => {
    const shipper = seedShipper();
    const proof = mockProof("ORD-new");
    vi.mocked(mockAdapter.anchorCreate).mockResolvedValue(proof);

    await createOrder(shipper.did, payload);

    expect(mockAdapter.anchorCreate).toHaveBeenCalledOnce();
    const [orderId, fingerprint, issuerDid, orderPayload] = vi.mocked(
      mockAdapter.anchorCreate
    ).mock.calls[0];
    expect(orderId).toBeTruthy();
    expect(fingerprint).toBeTruthy();
    expect(issuerDid).toBe(shipper.did);
    expect(orderPayload).toMatchObject({
      from: "Milan",
      to: "Rome",
      pickup_date: "2025-02-01",
    });
  });

  it("normalizes payload defaults", async () => {
    const shipper = seedShipper();
    vi.mocked(mockAdapter.anchorCreate).mockResolvedValue(mockProof("ORD-new"));

    const result = await createOrder(shipper.did, {});

    expect(result.token.payload_offledger.process_type).toBe("Tendering");
    expect(result.token.payload_offledger.load_type).toBe("FTL");
    expect(result.token.payload_offledger.from).toBe("-");
    expect(result.token.payload_offledger.to).toBe("-");
  });
});

describe("bookOrder", () => {
  const orderId = "ORD-book-001";

  it("throws 503 when not ready", async () => {
    vi.mocked(getOnChainWriteReadiness).mockReturnValue({
      ready: false,
      code: "WALLET_NOT_AVAILABLE",
      message: "Wallet not available",
    });
    seedCarrier();

    await expect(bookOrder(orderId, "did:iota:test_carrier1")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("throws 404 when order not found", async () => {
    seedCarrier();
    vi.mocked(getOrderById).mockResolvedValue(null);

    await expect(bookOrder(orderId, "did:iota:test_carrier1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws 409 when verification fails", async () => {
    seedCarrier();
    const token = makePendingToken(orderId, "did:iota:test_shipper1");
    vi.mocked(getOrderById).mockResolvedValue(token);
    vi.mocked(mockAdapter.verify).mockResolvedValue(mockVerification("PENDING", false));

    await expect(bookOrder(orderId, "did:iota:test_carrier1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("throws 409 when order is not PENDING on network", async () => {
    seedCarrier();
    const token = makePendingToken(orderId, "did:iota:test_shipper1");
    vi.mocked(getOrderById).mockResolvedValue(token);
    vi.mocked(mockAdapter.verify).mockResolvedValue(mockVerification("BOOKED", true));

    await expect(bookOrder(orderId, "did:iota:test_carrier1")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("throws 403 when actor is SHIPPER", async () => {
    seedShipper();
    const token = makePendingToken(orderId, "did:iota:test_shipper1");
    vi.mocked(getOrderById).mockResolvedValue(token);
    vi.mocked(mockAdapter.verify).mockResolvedValue(mockVerification("PENDING", true));

    await expect(bookOrder(orderId, "did:iota:test_shipper1")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("returns updated token with state BOOKED on success", async () => {
    seedShipper();
    const carrier = seedCarrier();
    const token = makePendingToken(orderId, "did:iota:test_shipper1");
    const bookedProof = mockProof(orderId, "BOOKED");
    vi.mocked(getOrderById).mockResolvedValue(token);
    vi.mocked(mockAdapter.verify).mockResolvedValue(mockVerification("PENDING", true));
    vi.mocked(mockAdapter.anchorUpdate).mockResolvedValue(bookedProof);

    const result = await bookOrder(orderId, carrier.did);

    expect(result.token.state).toBe("BOOKED");
    expect(result.token.carrier_did).toBe(carrier.did);
    expect(result.token.order_id).toBe(orderId);
    expect(result.proof).toBe(bookedProof);
  });
});

describe("markOrderDone", () => {
  const orderId = "ORD-done-001";
  const shipperDid = "did:iota:test_shipper1";
  const carrierDid = "did:iota:test_carrier1";

  it("throws 409 when order is not BOOKED on network", async () => {
    seedCarrier();
    const token = makeBookedToken(orderId, shipperDid, carrierDid);
    vi.mocked(getOrderById).mockResolvedValue(token);
    vi.mocked(mockAdapter.verify).mockResolvedValue(
      mockVerification("PENDING", true, carrierDid)
    );

    await expect(markOrderDone(orderId, carrierDid)).rejects.toMatchObject({ status: 409 });
  });

  it("throws 403 when actor is not the carrier who booked", async () => {
    const otherCarrier = seedCarrier("carrier2", "did:iota:test_carrier2");
    seedCarrier();
    const token = makeBookedToken(orderId, shipperDid, carrierDid);
    vi.mocked(getOrderById).mockResolvedValue(token);
    vi.mocked(mockAdapter.verify).mockResolvedValue(
      mockVerification("BOOKED", true, carrierDid)
    );

    await expect(markOrderDone(orderId, otherCarrier.did)).rejects.toMatchObject({
      status: 403,
    });
  });

  it("returns token with state DONE on success", async () => {
    seedShipper();
    const carrier = seedCarrier();
    const token = makeBookedToken(orderId, shipperDid, carrierDid);
    const doneProof = mockProof(orderId, "DONE");
    vi.mocked(getOrderById).mockResolvedValue(token);
    vi.mocked(mockAdapter.verify).mockResolvedValue(
      mockVerification("BOOKED", true, carrierDid)
    );
    vi.mocked(mockAdapter.anchorUpdate).mockResolvedValue(doneProof);

    const result = await markOrderDone(orderId, carrier.did);

    expect(result.token.state).toBe("DONE");
    expect(result.token.order_id).toBe(orderId);
    expect(result.proof).toBe(doneProof);
  });
});

describe("listOrders", () => {
  it("throws 401 when actor DID not found", async () => {
    await expect(listOrders("did:iota:nonexistent")).rejects.toMatchObject({ status: 401 });
  });

  it("returns { orders } for SHIPPER", async () => {
    seedShipper();
    const result = await listOrders("did:iota:test_shipper1");
    expect(result).toEqual({ orders: [] });
  });

  it("returns { pending, my_booked, my_done } for CARRIER", async () => {
    seedCarrier();
    const result = await listOrders("did:iota:test_carrier1");
    expect(result).toEqual({ pending: [], my_booked: [], my_done: [] });
  });
});
