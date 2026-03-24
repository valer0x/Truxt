# TRX - Documentazione Tecnica (Strict On-Chain)

## Panoramica

TRX e' un'app Vue 3 per workflow logistico SHIPPER/CARRIER con persistenza stato load su IOTA.

Policy attiva:

- nessun mock adapter
- nessun fallback hybrid
- source of truth load = solo eventi/transazioni on-chain
- scritture bloccate se setup on-chain non pronto

## Architettura

### UI layer

- `src/modules/auth/LoginPage.vue`
- `src/modules/onboarding/OnboardingPage.vue`
- `src/modules/dashboard/ShipperDashboard.vue`
- `src/modules/dashboard/CarrierDashboard.vue`
- `src/modules/dashboard/CreateLoadComposer.vue`

### Service layer

- `src/services/trx/trxApi.ts`
- `src/services/trx/iotaNetworkAdapter.ts`
- `src/services/trx/iotaOnChainAdapter.ts`
- `src/services/trx/iotaOnChainReadModel.ts`
- `src/services/trx/iotaOnChainEvents.ts`
- `src/services/trx/networkEvents.ts`
- `src/services/wallet/iotaWallet.ts`

### Smart contract

- `onchain/trx-load-registry/sources/load_registry.move`

## Contratto Move

Il modulo `load_registry` espone:

- `create_load(...)`
- `update_load_state(...)`

Campi salvati on-chain (Load):

- `order_id`, `fingerprint`, `state`, `issuer_did`, `carrier_did`
- `from_location`, `to_location`
- `pickup_date`, `pickup_window`, `weight`
- `reference`, `process_type`, `load_type`
- `equipment_requirements_hash`

Eventi emessi:

- `LoadCreatedEvent`
- `LoadStateChangedEvent`

## Wallet

`iotaWallet.ts` usa Wallet Standard come canale principale. Per le scritture e' richiesto supporto feature:

- `iota:signAndExecuteTransaction`

## Readiness scritture

`iotaOnChainConfig.ts` espone stato readiness:

- `MISSING_PACKAGE`
- `WALLET_NOT_AVAILABLE`
- `WALLET_NOT_SUPPORTED`
- `READY`

Se non `READY`, `createOrder/bookOrder/markOrderDone` falliscono con errore esplicito (HTTP-like 503 in `TrxApiError`).

## Read model on-chain

`iotaOnChainReadModel.ts` ricostruisce lo stato ordini leggendo eventi `MoveModule` via `queryEvents`.

- nessun ordine letto da localStorage
- cache in-memory con invalidazione su eventi rete (`trx:network-event`)
- dashboard SHIPPER/CARRIER alimentate solo da questo read-model

## Persistenza locale

`persistentStore.ts` mantiene solo profili DID (`profiles`).

- ordini/proof/ledger locali non sono usati come fonte runtime
- migrazione bootstrap in `main.ts` pulisce legacy data load e preserva profili

## Variabili ambiente

Minime per modalità on-chain scrittura:

- `VITE_IOTA_TRX_PACKAGE_ID` (obbligatoria)
- `VITE_IOTA_TRX_MODULE` (default: `load_registry`)
- `VITE_IOTA_FULLNODE_URL` (opzionale, default testnet)
- `VITE_IOTA_TRX_EVENT_POLL_MS` (default: 2500)

## Flussi principali

1. Login wallet -> onboarding/redirect dashboard.
2. SHIPPER crea load -> tx on-chain + evento.
3. CARRIER vede `Available` senza refresh manuale (event-based sync).
4. CARRIER `Book`/`Done` -> update on-chain + propagazione eventi.

## Criteri di accettazione

1. Senza package id: dashboard visibile, scritture disabilitate/bloccate, nessun `mock_tx`.
2. Con package id + wallet compatibile: proof con digest reale.
3. Aggiornamenti stato propagati automaticamente tra dashboard.
4. `npm run lint` e `npm run build` verdi.
