import type { NetworkAdapter } from "@/services/trx/networkAdapter";
import { IotaOnChainAdapter } from "@/services/trx/iotaOnChainAdapter";

let singletonAdapter: NetworkAdapter | null = null;

export function getNetworkAdapter(): NetworkAdapter {
  if (!singletonAdapter) {
    singletonAdapter = new IotaOnChainAdapter();
  }

  return singletonAdapter;
}
