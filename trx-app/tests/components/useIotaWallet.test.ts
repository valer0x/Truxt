import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WalletConnection, WalletDebugSnapshot } from "@/services/wallet/iotaWallet";

const defaultDebug: WalletDebugSnapshot = {
  source: "test",
  providerName: null,
  standardWalletsFound: 0,
  probeHits: [],
  lastError: null,
  walletStandardReady: false,
  supportsSignAndExecute: false,
};

const mockService = {
  isAvailable: vi.fn(() => false),
  isExtensionInstalled: vi.fn(() => false),
  providerName: vi.fn(() => null),
  connect: vi.fn<[], Promise<WalletConnection>>(),
  disconnect: vi.fn<[], Promise<void>>(),
  refresh: vi.fn<[], Promise<WalletConnection | null>>(() => Promise.resolve(null)),
  debugSnapshot: vi.fn<[], WalletDebugSnapshot>(() => ({ ...defaultDebug })),
  hasWalletStandardTransactionSupport: vi.fn(() => false),
  getWalletStandardSession: vi.fn(() => null),
  snapshot: vi.fn(() => null),
};

vi.mock("@/services/wallet/iotaWallet", () => ({
  getIotaWalletService: () => mockService,
}));

async function loadFresh() {
  vi.resetModules();

  vi.doMock("@/services/wallet/iotaWallet", () => ({
    getIotaWalletService: () => mockService,
  }));

  const mod = await import("@/shared/composables/useIotaWallet");
  return mod.useIotaWallet();
}

describe("useIotaWallet", () => {
  beforeEach(() => {
    vi.mocked(mockService.isAvailable).mockReturnValue(false);
    vi.mocked(mockService.isExtensionInstalled).mockReturnValue(false);
    vi.mocked(mockService.providerName).mockReturnValue(null);
    vi.mocked(mockService.connect).mockReset();
    vi.mocked(mockService.disconnect).mockResolvedValue(undefined);
    vi.mocked(mockService.refresh).mockResolvedValue(null);
    vi.mocked(mockService.debugSnapshot).mockReturnValue({ ...defaultDebug });
  });

  it('when service is not available, connect() sets error "IOTA wallet extension not available"', async () => {
    mockService.isAvailable.mockReturnValue(false);
    const wallet = await loadFresh();
    await wallet.connect();
    expect(wallet.error.value).toBe("IOTA wallet extension not available");
  });

  it("when service is available and connect succeeds, address/account/network are updated", async () => {
    mockService.isAvailable.mockReturnValue(true);
    mockService.connect.mockResolvedValue({
      address: "0x123",
      account: "acc_1",
      network: "iota:testnet",
      providerName: "TestWallet",
    });

    const wallet = await loadFresh();
    await wallet.connect();
    expect(wallet.address.value).toBe("0x123");
    expect(wallet.account.value).toBe("acc_1");
    expect(wallet.network.value).toBe("iota:testnet");
    expect(wallet.error.value).toBeNull();
  });

  it("when service connect throws, error ref is set", async () => {
    mockService.isAvailable.mockReturnValue(true);
    mockService.connect.mockRejectedValue(new Error("User rejected"));

    const wallet = await loadFresh();
    await wallet.connect();
    expect(wallet.error.value).toBe("User rejected");
  });

  it("isConnected is true when address is non-null", async () => {
    mockService.isAvailable.mockReturnValue(true);
    mockService.connect.mockResolvedValue({
      address: "0xABC",
      account: "acc_2",
      network: "iota:mainnet",
      providerName: "TestWallet",
    });

    const wallet = await loadFresh();
    expect(wallet.isConnected.value).toBe(false);
    await wallet.connect();
    expect(wallet.isConnected.value).toBe(true);
  });

  it("disconnect resets address to null", async () => {
    mockService.isAvailable.mockReturnValue(true);
    mockService.connect.mockResolvedValue({
      address: "0xDISC",
      account: "acc_3",
      network: "iota:testnet",
      providerName: "TestWallet",
    });

    const wallet = await loadFresh();
    await wallet.connect();
    expect(wallet.address.value).toBe("0xDISC");
    await wallet.disconnect();
    expect(wallet.address.value).toBeNull();
  });
});
