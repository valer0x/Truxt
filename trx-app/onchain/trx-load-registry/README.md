# TRX Load Registry (Move)

`load_registry` is the strict on-chain contract for TRX loads.

## What it stores on-chain

- `order_id`
- `fingerprint`
- `issuer_did`
- `carrier_did`
- `state`
- `from_location`
- `to_location`
- `pickup_date`
- `pickup_window`
- `weight`
- `reference`
- `process_type`
- `load_type`
- `equipment_requirements_hash`

## Events emitted

- `LoadCreatedEvent`
- `LoadStateChangedEvent`

These events are consumed by the frontend read-model (`iotaOnChainReadModel.ts`) as the single source of truth.

## Build and publish

```bash
# TODO: verify CLI command names for your iota CLI version.
iota move build --path ./onchain/trx-load-registry
iota client publish --gas-budget 200000000 --path ./onchain/trx-load-registry
```

After publish set:

```bash
VITE_IOTA_TRX_PACKAGE_ID=<published_package_id>
VITE_IOTA_TRX_MODULE=load_registry
VITE_IOTA_FULLNODE_URL=<network_fullnode_url>
VITE_IOTA_TRX_EVENT_POLL_MS=2500
```

## Notes

- In strict mode there is no mock adapter and no local load persistence fallback.
- `tx_id` in Move event payload remains placeholder; frontend resolves real digest from `event.id.txDigest`.
- On contract upgrade, republish and update `VITE_IOTA_TRX_PACKAGE_ID`.
