import { getWallets, isWalletWithRequiredFeatureSet, type Wallet } from "@iota/wallet-standard";

type UnknownRecord = Record<string, unknown>;

interface ProviderRequestPayload {
  method: string;
  params?: unknown;
}

interface WalletStandardConnectFeature {
  connect: () => Promise<unknown>;
}

interface WalletStandardDisconnectFeature {
  disconnect: () => Promise<unknown>;
}

interface WalletStandardSignAndExecuteFeature {
  signAndExecuteTransaction?: (...args: unknown[]) => Promise<unknown>;
}

interface WalletStandardFeatureMap {
  "standard:connect"?: WalletStandardConnectFeature;
  "standard:disconnect"?: WalletStandardDisconnectFeature;
  "iota:signAndExecuteTransaction"?: WalletStandardSignAndExecuteFeature;
  [key: string]: unknown;
}

interface WalletStandardAccount {
  address?: string;
  chains?: string[];
  id?: string;
}

interface WalletStandardWalletShape {
  name?: string;
  chains?: string[];
  features?: WalletStandardFeatureMap;
  accounts?: WalletStandardAccount[];
}

export interface IotaWalletProvider {
  connect?: () => Promise<unknown>;
  enable?: () => Promise<unknown>;
  disconnect?: () => Promise<unknown>;
  getAddress?: () => Promise<string>;
  getAccounts?: () => Promise<string[]>;
  getNetwork?: () => Promise<string>;
  request?: (payload: ProviderRequestPayload) => Promise<unknown>;
  isConnected?: (() => boolean | Promise<boolean>) | boolean;
  selectedAddress?: string;
  account?: string | { address?: string; id?: string };
}

interface ProviderResolution {
  provider: IotaWalletProvider | null;
  providerName: string | null;
  extensionInstalled: boolean;
  walletStandard: WalletStandardWalletShape | null;
}

export interface WalletConnection {
  address: string;
  account: string | null;
  network: string | null;
  providerName: string;
}

export interface WalletStandardSession {
  wallet: Wallet;
  account: WalletStandardAccount;
  chain: string;
}

export interface WalletDebugSnapshot {
  source: string;
  providerName: string | null;
  standardWalletsFound: number;
  probeHits: string[];
  lastError: string | null;
  walletStandardReady: boolean;
  supportsSignAndExecute: boolean;
}

declare global {
  interface Window {
    iota?: unknown;
    iotaWallet?: unknown;
    __IOTA__?: unknown;
    firefly?: unknown;
    nightly?: { iota?: unknown };
  }

  interface Navigator {
    wallets?: unknown;
  }
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function hasFunction<T extends UnknownRecord>(value: T, key: string): boolean {
  return typeof value[key] === "function";
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("reject") || message.includes("denied") || message.includes("cancel")) {
      return "Wallet connect rejected by user";
    }
  }

  return "Wallet connect rejected by user";
}

function isWalletStandardCandidate(wallet: WalletStandardWalletShape): boolean {
  if (!isWalletWithRequiredFeatureSet(wallet as unknown as Wallet)) {
    return false;
  }

  const features = wallet.features ?? {};
  const hasIotaFeature = Object.keys(features).some((key) => key.startsWith("iota:"));
  const walletName = typeof wallet.name === "string" ? wallet.name.toLowerCase() : "";
  const hasIotaName = walletName.includes("iota");

  return hasIotaFeature || hasIotaName;
}

function hasWalletStandardSignAndExecute(wallet: WalletStandardWalletShape): boolean {
  const feature = wallet.features?.["iota:signAndExecuteTransaction"];
  if (!isObject(feature)) {
    return false;
  }

  return typeof feature.signAndExecuteTransaction === "function";
}

function readWalletStandardAddress(wallet: WalletStandardWalletShape): string | null {
  const account = wallet.accounts?.[0];
  if (account && typeof account.address === "string" && account.address.trim()) {
    return account.address;
  }

  return null;
}

function readWalletStandardNetwork(wallet: WalletStandardWalletShape): string | null {
  const chain = wallet.accounts?.[0]?.chains?.[0] ?? wallet.chains?.[0];
  if (typeof chain === "string" && chain.trim()) {
    return chain;
  }

  return null;
}

function readWalletStandardAccount(wallet: WalletStandardWalletShape, fallbackAddress: string): string {
  const accountId = wallet.accounts?.[0]?.id;
  if (typeof accountId === "string" && accountId.trim()) {
    return accountId;
  }

  return fallbackAddress;
}

function readFeatureMethod(
  wallet: WalletStandardWalletShape,
  featureKey: keyof WalletStandardFeatureMap,
  methodName: "connect" | "disconnect"
): ((...args: unknown[]) => Promise<unknown>) | null {
  const features = wallet.features;
  if (!features || typeof features !== "object") {
    return null;
  }

  const feature = features[featureKey];
  if (!isObject(feature)) {
    return null;
  }

  const method = feature[methodName];
  if (typeof method !== "function") {
    return null;
  }

  return method as (...args: unknown[]) => Promise<unknown>;
}

function createProviderFromWalletStandard(wallet: WalletStandardWalletShape): IotaWalletProvider {
  return {
    async connect() {
      const connectMethod = readFeatureMethod(wallet, "standard:connect", "connect");
      if (!connectMethod) {
        throw new Error("Wallet standard connect feature is not available");
      }

      return connectMethod();
    },
    async disconnect() {
      const disconnectMethod = readFeatureMethod(wallet, "standard:disconnect", "disconnect");
      if (disconnectMethod) {
        await disconnectMethod();
      }
    },
    async getAddress() {
      return readWalletStandardAddress(wallet) ?? "";
    },
    async getAccounts() {
      const address = readWalletStandardAddress(wallet);
      return address ? [address] : [];
    },
    async getNetwork() {
      return readWalletStandardNetwork(wallet) ?? "";
    },
    async isConnected() {
      return Boolean(readWalletStandardAddress(wallet));
    },
    get selectedAddress() {
      return readWalletStandardAddress(wallet) ?? undefined;
    },
    get account() {
      const address = readWalletStandardAddress(wallet);
      if (!address) {
        return undefined;
      }

      return {
        id: readWalletStandardAccount(wallet, address),
        address,
      };
    },
  };
}

function asWalletStandardWallet(raw: unknown): WalletStandardWalletShape | null {
  if (!isObject(raw)) {
    return null;
  }

  if (isObject(raw.standardWallet)) {
    return asWalletStandardWallet(raw.standardWallet);
  }

  if (!isWalletStandardCandidate(raw as WalletStandardWalletShape)) {
    return null;
  }

  return raw as WalletStandardWalletShape;
}

function asProviderCandidate(raw: unknown, depth = 3, visited = new Set<unknown>()): IotaWalletProvider | null {
  if (!isObject(raw) || visited.has(raw)) {
    return null;
  }
  visited.add(raw);

  const standardWallet = asWalletStandardWallet(raw);
  if (standardWallet) {
    return createProviderFromWalletStandard(standardWallet);
  }

  if (hasFunction(raw, "connect") || hasFunction(raw, "request") || hasFunction(raw, "getAddress")) {
    return raw as IotaWalletProvider;
  }

  if (depth <= 0) {
    return null;
  }

  const nestedKeys = [
    "provider",
    "wallet",
    "iota",
    "iotaWallet",
    "standardWallet",
    "adapter",
    "api",
    "client",
    "connector",
  ];

  for (const key of nestedKeys) {
    const nested = raw[key];
    const candidate = asProviderCandidate(nested, depth - 1, visited);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function extractWalletStandardAccounts(connectOutput: unknown): WalletStandardAccount[] {
  const container = isObject(connectOutput) ? connectOutput : null;
  const accounts = container?.accounts;
  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts.filter((item) => isObject(item)) as WalletStandardAccount[];
}

function isSameWalletAccount(left: WalletStandardAccount | null, right: WalletStandardAccount | null): boolean {
  if (!left || !right) {
    return false;
  }

  return Boolean(left.address && right.address && left.address === right.address);
}

function detectWalletStandardProvider(): {
  provider: IotaWalletProvider | null;
  providerName: string | null;
  standardWalletsFound: number;
  probeHits: string[];
  walletStandard: WalletStandardWalletShape | null;
} {
  const registry = getWallets();
  const wallets = registry.get() as Wallet[];

  const probeHits: string[] = [];
  let standardWalletsFound = 0;

  for (const wallet of wallets) {
    const candidate = asWalletStandardWallet(wallet as unknown);
    if (!candidate) {
      continue;
    }

    standardWalletsFound += 1;
    const walletName = typeof candidate.name === "string" ? candidate.name : "wallet-standard-wallet";
    probeHits.push(`wallet-standard:${walletName}`);

    return {
      provider: createProviderFromWalletStandard(candidate),
      providerName: `wallet-standard:${walletName}`,
      standardWalletsFound,
      probeHits,
      walletStandard: candidate,
    };
  }

  return {
    provider: null,
    providerName: null,
    standardWalletsFound,
    probeHits,
    walletStandard: null,
  };
}

function detectLegacyProvider(): {
  provider: IotaWalletProvider | null;
  providerName: string | null;
  probeHits: string[];
} {
  const probes: Array<{ name: string; raw: unknown }> = [
    { name: "window.iotaWallet", raw: window.iotaWallet },
    { name: "window.iota", raw: window.iota },
    { name: "window.__IOTA__", raw: window.__IOTA__ },
    { name: "window.firefly", raw: window.firefly },
    { name: "window.nightly.iota", raw: window.nightly?.iota },
    { name: "window.nightly", raw: window.nightly },
  ];

  const probeHits: string[] = [];

  for (const probe of probes) {
    const candidate = asProviderCandidate(probe.raw);
    if (!candidate) {
      continue;
    }

    probeHits.push(probe.name);
    return {
      provider: candidate,
      providerName: probe.name,
      probeHits,
    };
  }

  return {
    provider: null,
    providerName: null,
    probeHits,
  };
}

function detectNavigatorProvider(): {
  provider: IotaWalletProvider | null;
  providerName: string | null;
  probeHits: string[];
} {
  const probeHits: string[] = [];

  const wallets = window.navigator.wallets;
  if (!Array.isArray(wallets)) {
    return {
      provider: null,
      providerName: null,
      probeHits,
    };
  }

  for (const wallet of wallets) {
    const candidate = asProviderCandidate(wallet);
    if (!candidate) {
      continue;
    }

    probeHits.push("window.navigator.wallets");
    return {
      provider: candidate,
      providerName: "window.navigator.wallets",
      probeHits,
    };
  }

  return {
    provider: null,
    providerName: null,
    probeHits,
  };
}

export class IotaWalletService {
  private connectedSnapshot: WalletConnection | null = null;
  private activeWalletStandard: WalletStandardWalletShape | null = null;
  private activeWalletStandardAccount: WalletStandardAccount | null = null;
  private lastError: string | null = null;
  private lastSource = "none";
  private lastProviderName: string | null = null;
  private lastStandardWalletsFound = 0;
  private lastProbeHits: string[] = [];

  private detectProvider(): ProviderResolution {
    const standard = detectWalletStandardProvider();
    const probeHits: string[] = [...standard.probeHits];

    if (standard.provider && standard.walletStandard) {
      this.activeWalletStandard = standard.walletStandard;
      const firstAccount = standard.walletStandard.accounts?.[0] ?? null;
      if (!isSameWalletAccount(this.activeWalletStandardAccount, firstAccount)) {
        this.activeWalletStandardAccount = firstAccount;
      }

      this.lastSource = "wallet-standard";
      this.lastProviderName = standard.providerName;
      this.lastStandardWalletsFound = standard.standardWalletsFound;
      this.lastProbeHits = probeHits;

      return {
        provider: standard.provider,
        providerName: standard.providerName,
        extensionInstalled: true,
        walletStandard: standard.walletStandard,
      };
    }

    const legacy = detectLegacyProvider();
    probeHits.push(...legacy.probeHits);
    if (legacy.provider) {
      this.activeWalletStandard = null;
      this.activeWalletStandardAccount = null;
      this.lastSource = "legacy-global";
      this.lastProviderName = legacy.providerName;
      this.lastStandardWalletsFound = standard.standardWalletsFound;
      this.lastProbeHits = probeHits;

      return {
        provider: legacy.provider,
        providerName: legacy.providerName,
        extensionInstalled: true,
        walletStandard: null,
      };
    }

    const navigatorProvider = detectNavigatorProvider();
    probeHits.push(...navigatorProvider.probeHits);
    if (navigatorProvider.provider) {
      this.activeWalletStandard = null;
      this.activeWalletStandardAccount = null;
      this.lastSource = "navigator-wallets";
      this.lastProviderName = navigatorProvider.providerName;
      this.lastStandardWalletsFound = standard.standardWalletsFound;
      this.lastProbeHits = probeHits;

      return {
        provider: navigatorProvider.provider,
        providerName: navigatorProvider.providerName,
        extensionInstalled: true,
        walletStandard: null,
      };
    }

    this.activeWalletStandard = null;
    this.activeWalletStandardAccount = null;
    this.lastSource = "none";
    this.lastProviderName = null;
    this.lastStandardWalletsFound = standard.standardWalletsFound;
    this.lastProbeHits = probeHits;

    return {
      provider: null,
      providerName: null,
      extensionInstalled: false,
      walletStandard: null,
    };
  }

  private async resolveWithRetry(maxWaitMs = 1800): Promise<ProviderResolution> {
    const startedAt = Date.now();

    while (Date.now() - startedAt <= maxWaitMs) {
      const resolved = this.detectProvider();
      if (resolved.provider) {
        return resolved;
      }

      await delay(120);
    }

    return this.detectProvider();
  }

  isAvailable(): boolean {
    return Boolean(this.detectProvider().provider);
  }

  isExtensionInstalled(): boolean {
    return this.detectProvider().extensionInstalled;
  }

  providerName(): string | null {
    return this.detectProvider().providerName;
  }

  hasWalletStandardTransactionSupport(): boolean {
    const resolution = this.detectProvider();
    const wallet = resolution.walletStandard;
    if (!wallet) {
      return false;
    }

    if (!hasWalletStandardSignAndExecute(wallet)) {
      return false;
    }

    const account = this.activeWalletStandardAccount ?? wallet.accounts?.[0] ?? null;
    return Boolean(account?.address && (account?.chains?.[0] ?? wallet.chains?.[0]));
  }

  getWalletStandardSession(): WalletStandardSession | null {
    const resolution = this.detectProvider();
    const wallet = resolution.walletStandard;
    if (!wallet || !hasWalletStandardSignAndExecute(wallet)) {
      return null;
    }

    const account = this.activeWalletStandardAccount ?? wallet.accounts?.[0] ?? null;
    if (!account?.address) {
      return null;
    }

    const chain = account.chains?.[0] ?? wallet.chains?.[0];
    if (!chain) {
      return null;
    }

    return {
      wallet: wallet as unknown as Wallet,
      account,
      chain,
    };
  }

  debugSnapshot(): WalletDebugSnapshot {
    return {
      source: this.lastSource,
      providerName: this.lastProviderName,
      standardWalletsFound: this.lastStandardWalletsFound,
      probeHits: [...this.lastProbeHits],
      lastError: this.lastError,
      walletStandardReady: Boolean(this.getWalletStandardSession()),
      supportsSignAndExecute: this.hasWalletStandardTransactionSupport(),
    };
  }

  private async requestConnection(resolution: ProviderResolution): Promise<void> {
    const provider = resolution.provider;
    if (!provider) {
      throw new Error("No IOTA wallet provider found");
    }

    if (resolution.walletStandard) {
      const connectMethod = readFeatureMethod(resolution.walletStandard, "standard:connect", "connect");
      if (connectMethod) {
        const result = await connectMethod();
        const connectedAccounts = extractWalletStandardAccounts(result);
        const firstConnected = connectedAccounts[0] ?? null;
        this.activeWalletStandardAccount = firstConnected ?? resolution.walletStandard.accounts?.[0] ?? null;
        return;
      }
    }

    if (provider.connect) {
      await provider.connect();
      return;
    }

    if (provider.enable) {
      await provider.enable();
      return;
    }

    if (provider.request) {
      await provider.request({ method: "iota_connect" });
      return;
    }

    throw new Error("No IOTA wallet provider found");
  }

  private async readAddress(provider: IotaWalletProvider): Promise<string | null> {
    const session = this.getWalletStandardSession();
    if (session?.account.address) {
      return session.account.address;
    }

    if (provider.getAddress) {
      const direct = await provider.getAddress();
      if (direct && direct.trim()) {
        return direct;
      }
    }

    if (provider.selectedAddress && provider.selectedAddress.trim()) {
      return provider.selectedAddress;
    }

    if (typeof provider.account === "string" && provider.account.trim()) {
      return provider.account;
    }

    if (isObject(provider.account) && typeof provider.account.address === "string" && provider.account.address.trim()) {
      return provider.account.address;
    }

    if (provider.getAccounts) {
      const accounts = await provider.getAccounts();
      if (accounts.length > 0) {
        return accounts[0];
      }
    }

    if (provider.request) {
      const response = await provider.request({ method: "iota_getAccounts" });
      if (Array.isArray(response) && typeof response[0] === "string" && response[0].trim()) {
        return response[0];
      }
    }

    return null;
  }

  private async readNetwork(provider: IotaWalletProvider): Promise<string | null> {
    const session = this.getWalletStandardSession();
    if (session?.chain) {
      return session.chain;
    }

    if (provider.getNetwork) {
      const network = await provider.getNetwork();
      if (network && network.trim()) {
        return network;
      }
    }

    if (provider.request) {
      const response = await provider.request({ method: "iota_getNetwork" });
      if (typeof response === "string" && response.trim()) {
        return response;
      }
    }

    return null;
  }

  private readAccountIdentifier(provider: IotaWalletProvider, address: string): string {
    const session = this.getWalletStandardSession();
    if (session?.account.id && session.account.id.trim()) {
      return session.account.id;
    }

    if (typeof provider.account === "string" && provider.account.trim()) {
      return provider.account;
    }

    if (isObject(provider.account) && typeof provider.account.id === "string" && provider.account.id.trim()) {
      return provider.account.id;
    }

    return address;
  }

  async connect(): Promise<WalletConnection> {
    const resolution = await this.resolveWithRetry();
    if (!resolution.provider) {
      this.lastError = "No IOTA wallet provider found";
      throw new Error("No IOTA wallet provider found");
    }

    try {
      await this.requestConnection(resolution);
    } catch (connectionError) {
      const message = normalizeErrorMessage(connectionError);
      this.lastError = message;
      throw new Error(message);
    }

    const address = await this.readAddress(resolution.provider);
    if (!address) {
      this.lastError = "Connected wallet did not return an address";
      throw new Error("Connected wallet did not return an address");
    }

    this.lastError = null;

    const snapshot: WalletConnection = {
      address,
      account: this.readAccountIdentifier(resolution.provider, address),
      network: await this.readNetwork(resolution.provider),
      providerName: resolution.providerName ?? "unknown-provider",
    };

    this.connectedSnapshot = snapshot;
    return snapshot;
  }

  async refresh(): Promise<WalletConnection | null> {
    const resolution = await this.resolveWithRetry(400);
    if (!resolution.provider) {
      this.connectedSnapshot = null;
      return null;
    }

    const isConnectedFlag = resolution.provider.isConnected;
    if (typeof isConnectedFlag === "function") {
      const active = await isConnectedFlag();
      if (!active) {
        this.connectedSnapshot = null;
        return null;
      }
    } else if (isConnectedFlag === false) {
      this.connectedSnapshot = null;
      return null;
    }

    const address = await this.readAddress(resolution.provider);
    if (!address) {
      this.connectedSnapshot = null;
      return null;
    }

    this.lastError = null;

    const snapshot: WalletConnection = {
      address,
      account: this.readAccountIdentifier(resolution.provider, address),
      network: await this.readNetwork(resolution.provider),
      providerName: resolution.providerName ?? "unknown-provider",
    };

    this.connectedSnapshot = snapshot;
    return snapshot;
  }

  async disconnect(): Promise<void> {
    const resolution = this.detectProvider();

    if (resolution.walletStandard) {
      const disconnectMethod = readFeatureMethod(resolution.walletStandard, "standard:disconnect", "disconnect");
      if (disconnectMethod) {
        await disconnectMethod();
      }
    } else if (resolution.provider?.disconnect) {
      await resolution.provider.disconnect();
    } else if (resolution.provider?.request) {
      await resolution.provider.request({ method: "iota_disconnect" });
    }

    this.activeWalletStandardAccount = null;
    this.connectedSnapshot = null;
  }

  snapshot(): WalletConnection | null {
    return this.connectedSnapshot;
  }
}

const singletonService = new IotaWalletService();

export function getIotaWalletService(): IotaWalletService {
  return singletonService;
}
