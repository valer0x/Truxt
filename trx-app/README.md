# TRX Vue 3 MVP (Strict On-Chain)

TRX is a Vue 3 logistics MVP where load lifecycle transitions are stored and verified on IOTA.

## Stack

- Vue 3 (Composition API + `<script setup>`)
- Vite + TypeScript
- Vue Router
- Pinia
- TailwindCSS
- `@iota/wallet-standard`
- `@iota/iota-sdk`

## Setup

```bash
cd trx-app
npm install
npm run dev
```

App URL: `http://localhost:5173`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Wallet integration

Key files:

- `src/services/wallet/iotaWallet.ts`
- `src/shared/composables/useIotaWallet.ts`

Detection strategy is Wallet Standard first (`@iota/wallet-standard`) with legacy provider probes only for detection/compatibility. Load writes require Wallet Standard `iota:signAndExecuteTransaction` support.

Chrome extension:

- https://chromewebstore.google.com/detail/iota-wallet/iidjkmdceolghepehaaddojmnjnkkija

## Strict on-chain behavior

- No mock adapter.
- No hybrid adapter.
- No localStorage source-of-truth for loads.
- Load lists are rebuilt from on-chain events (`LoadCreatedEvent`, `LoadStateChangedEvent`).
- If write readiness is not satisfied, create/book/done are blocked with explicit messages.

## On-chain files

- Contract: `onchain/trx-load-registry/sources/load_registry.move`
- Adapter: `src/services/trx/iotaOnChainAdapter.ts`
- Read-model: `src/services/trx/iotaOnChainReadModel.ts`
- Event parser: `src/services/trx/iotaOnChainEvents.ts`
- Event sync: `src/services/trx/networkEvents.ts`

## Required env for writes

```bash
VITE_IOTA_TRX_PACKAGE_ID=<published_package_id>
VITE_IOTA_TRX_MODULE=load_registry
VITE_IOTA_FULLNODE_URL=<optional, defaults to testnet>
VITE_IOTA_TRX_EVENT_POLL_MS=2500
```

`VITE_IOTA_TRX_PACKAGE_ID` is mandatory for on-chain writes.

## Migration behavior

At bootstrap, legacy `trx_database_v1` load/ledger/mock data is wiped (profiles are preserved) so old `mock_tx` proofs do not reappear.

## Manual test checklist

1. Start app without `VITE_IOTA_TRX_PACKAGE_ID`: dashboard opens, create/book/done blocked with explicit readiness message.
2. Set `VITE_IOTA_TRX_PACKAGE_ID` and restart.
3. Connect wallet supporting Wallet Standard sign+execute.
4. As shipper, create load and verify proof uses real tx digest/checkpoint (no `mock_tx`).
5. As carrier, verify load appears in `Available` and updates after `Book`/`Done` without manual refresh.
6. Run `npm run lint` and `npm run build`.
