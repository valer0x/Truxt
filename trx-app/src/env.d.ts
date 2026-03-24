/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IOTA_FULLNODE_URL?: string;
  readonly VITE_IOTA_TRX_PACKAGE_ID?: string;
  readonly VITE_IOTA_TRX_MODULE?: string;
  readonly VITE_IOTA_TRX_EVENT_POLL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
