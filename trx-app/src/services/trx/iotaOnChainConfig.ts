import { getFullnodeUrl } from "@iota/iota-sdk/client";
import { getIotaWalletService } from "@/services/wallet/iotaWallet";

const DEFAULT_MODULE_NAME = "load_registry";
const DEFAULT_POLL_INTERVAL_MS = 2_500;

function normalizeObjectId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }

  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function parsePollInterval(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 500) {
    return DEFAULT_POLL_INTERVAL_MS;
  }

  return Math.floor(value);
}

export interface IotaOnChainConfig {
  enabled: boolean;
  packageId: string | null;
  moduleName: string;
  fullnodeUrl: string;
  pollIntervalMs: number;
}

export interface OnChainWriteReadiness {
  ready: boolean;
  code: "MISSING_PACKAGE" | "WALLET_NOT_AVAILABLE" | "WALLET_NOT_SUPPORTED" | "READY";
  message: string;
}

export function getIotaOnChainConfig(): IotaOnChainConfig {
  const packageId = import.meta.env.VITE_IOTA_TRX_PACKAGE_ID
    ? normalizeObjectId(import.meta.env.VITE_IOTA_TRX_PACKAGE_ID)
    : null;
  const moduleName = (import.meta.env.VITE_IOTA_TRX_MODULE || DEFAULT_MODULE_NAME).trim() || DEFAULT_MODULE_NAME;
  const fullnodeUrl = import.meta.env.VITE_IOTA_FULLNODE_URL?.trim() || getFullnodeUrl("testnet");
  const pollIntervalMs = parsePollInterval(import.meta.env.VITE_IOTA_TRX_EVENT_POLL_MS);

  return {
    enabled: Boolean(packageId),
    packageId,
    moduleName,
    fullnodeUrl,
    pollIntervalMs,
  };
}

export function isIotaOnChainConfigured(): boolean {
  return getIotaOnChainConfig().enabled;
}

export function getOnChainWriteReadiness(): OnChainWriteReadiness {
  const config = getIotaOnChainConfig();
  if (!config.packageId) {
    return {
      ready: false,
      code: "MISSING_PACKAGE",
      message: "On-chain setup incomplete: VITE_IOTA_TRX_PACKAGE_ID is required.",
    };
  }

  const walletService = getIotaWalletService();
  if (!walletService.isAvailable()) {
    return {
      ready: false,
      code: "WALLET_NOT_AVAILABLE",
      message: "IOTA Wallet extension not detected. Install and connect a compatible wallet.",
    };
  }

  if (!walletService.hasWalletStandardTransactionSupport()) {
    return {
      ready: false,
      code: "WALLET_NOT_SUPPORTED",
      message: "Connected wallet does not support Wallet Standard signAndExecuteTransaction.",
    };
  }

  return {
    ready: true,
    code: "READY",
    message: "On-chain write readiness: ready.",
  };
}

export function assertOnChainWriteReady(): void {
  const readiness = getOnChainWriteReadiness();
  if (!readiness.ready) {
    throw new Error(readiness.message);
  }
}
