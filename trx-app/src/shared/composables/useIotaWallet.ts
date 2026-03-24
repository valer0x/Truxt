import { computed, ref } from "vue";
import { getIotaWalletService, type WalletConnection, type WalletDebugSnapshot } from "@/services/wallet/iotaWallet";

const service = getIotaWalletService();

const address = ref<string | null>(null);
const account = ref<string | null>(null);
const network = ref<string | null>(null);
const providerName = ref<string | null>(service.providerName());
const extensionInstalled = ref<boolean>(service.isExtensionInstalled());
const availability = ref<boolean>(service.isAvailable());
const connecting = ref<boolean>(false);
const error = ref<string | null>(null);
const debug = ref<WalletDebugSnapshot>(service.debugSnapshot());

let initialized = false;

function updateFromSnapshot(snapshot: WalletConnection | null): void {
  address.value = snapshot?.address ?? null;
  account.value = snapshot?.account ?? null;
  network.value = snapshot?.network ?? null;
  providerName.value = snapshot?.providerName ?? service.providerName();
}

function syncAvailability(): void {
  availability.value = service.isAvailable();
  extensionInstalled.value = service.isExtensionInstalled();
  providerName.value = service.providerName();
  debug.value = service.debugSnapshot();
}

async function connect(): Promise<void> {
  syncAvailability();
  error.value = null;

  if (!availability.value) {
    error.value = "IOTA wallet extension not available";
    debug.value = service.debugSnapshot();
    return;
  }

  connecting.value = true;
  try {
    const snapshot = await service.connect();
    updateFromSnapshot(snapshot);
  } catch (connectError) {
    error.value = connectError instanceof Error ? connectError.message : "Wallet connection failed";
  } finally {
    connecting.value = false;
    debug.value = service.debugSnapshot();
  }
}

async function refresh(): Promise<void> {
  syncAvailability();
  error.value = null;

  try {
    const snapshot = await service.refresh();
    updateFromSnapshot(snapshot);
  } catch (refreshError) {
    error.value = refreshError instanceof Error ? refreshError.message : "Wallet refresh failed";
  } finally {
    debug.value = service.debugSnapshot();
  }
}

async function disconnect(): Promise<void> {
  error.value = null;

  try {
    await service.disconnect();
    updateFromSnapshot(null);
    syncAvailability();
  } catch (disconnectError) {
    error.value = disconnectError instanceof Error ? disconnectError.message : "Wallet disconnection failed";
  } finally {
    debug.value = service.debugSnapshot();
  }
}

export function useIotaWallet() {
  if (!initialized) {
    initialized = true;
    void refresh();
  }

  return {
    isAvailable: computed(() => availability.value),
    isConnected: computed(() => Boolean(address.value)),
    isExtensionInstalled: computed(() => extensionInstalled.value),
    connecting: computed(() => connecting.value),
    address,
    account,
    network,
    providerName,
    error,
    debug,
    connect,
    disconnect,
    refresh,
  };
}
