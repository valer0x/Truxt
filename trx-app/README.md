# TRX — Anti-Phantom Load System on IOTA

A B2B logistics webapp that prevents phantom loads by anchoring load tokens on the IOTA network. Every state transition (PENDING → BOOKED → DONE) is verified against the network before being allowed.

## Quick Start

```bash
cd trx-app
npm install
npm run dev
```

Open http://localhost:3000

### Demo Walkthrough

1. **Register a Shipper**: Go to `/login`, enter wallet `0xSHIPPER1`, complete onboarding as SHIPPER.
2. **Create a Load**: Click "Create Load", fill in lane/date/weight, publish.
3. **Register a Carrier**: Open a new tab/incognito, go to `/login`, enter `0xCARRIER1`, complete onboarding as CARRIER.
4. **Book the Load**: The carrier sees pending loads. Click "Book" on a verified load.
5. **Mark as Done**: The booked load appears in "My Booked Loads". Click "Mark as Done".
6. **Verify on Shipper side**: Switch to the shipper tab, refresh — the load now shows DONE with network proof.

---

## Architecture

```
src/
├── domain/           # Pure business logic
│   ├── types.ts      # Core types (DIDProfile, OrderToken, etc.)
│   └── state-machine.ts  # State transitions & authorization rules
├── services/         # Infrastructure adapters
│   ├── network-adapter.ts    # NetworkAdapter interface
│   ├── mock-iota-adapter.ts  # Mock implementation (swap for real IOTA)
│   └── did-service.ts        # DID creation & lookup
├── lib/              # Utilities
│   ├── store.ts      # In-memory storage (swap for DB)
│   ├── fingerprint.ts # SHA-256 fingerprint computation
│   └── seed.ts       # Demo data script
├── ui/components/    # Reusable UI components
│   ├── session-context.tsx   # Client-side session state
│   ├── providers.tsx         # React context providers
│   ├── top-bar.tsx           # App header
│   ├── status-badge.tsx      # State & verification badges
│   ├── proof-modal.tsx       # Network proof viewer
│   ├── create-load-modal.tsx # Load creation form
│   ├── shipper-dashboard.tsx # Shipper view
│   └── carrier-dashboard.tsx # Carrier view
└── app/              # Next.js App Router
    ├── layout.tsx
    ├── page.tsx      # Redirects to /login
    ├── login/page.tsx
    ├── onboarding/page.tsx
    ├── dashboard/page.tsx
    └── api/
        ├── auth/connect/route.ts
        ├── onboarding/route.ts
        └── orders/
            ├── route.ts              # GET & POST /api/orders
            └── [order_id]/
                ├── book/route.ts     # POST /api/orders/:id/book
                └── done/route.ts     # POST /api/orders/:id/done
```

---

## API Endpoints

All mutating endpoints require the `x-actor-did` header with the actor's DID.

### `POST /api/auth/connect`
Connect a wallet to check registration status.

| Field | Type | Description |
|-------|------|-------------|
| `wallet_address` | string | Wallet address to connect |

**Response:**
```json
{ "registered": true, "role": "SHIPPER", "did": "did:iota:...", "redirect": "/dashboard" }
// or
{ "registered": false, "redirect": "/onboarding" }
```

### `POST /api/onboarding`
Register a new DID profile.

| Field | Type | Description |
|-------|------|-------------|
| `wallet_address` | string | Wallet address |
| `role` | "SHIPPER" \| "CARRIER" | User role |
| `company_name` | string | Company name |
| `country` | string | Country code |
| `legal_id` | string | Legal identifier (hashed on storage) |
| `load_id_standard` | string? | Shipper-only load ID standard |

**Response:** `201` with DIDProfile object.

### `POST /api/orders`
Create a new load (SHIPPER only).

**Headers:** `x-actor-did: did:iota:...`

| Field | Type | Description |
|-------|------|-------------|
| `from` | string | Origin location |
| `to` | string | Destination location |
| `pickup_date` | string | Pickup date |
| `pickup_window` | string | Pickup time window |
| `weight` | number | Weight in lbs |
| `reference` | string | PO or reference number |

**Response:** `201` with `{ token: OrderToken, proof: NetworkProof }`

### `GET /api/orders`
List orders based on caller's role.

**Headers:** `x-actor-did: did:iota:...`

**SHIPPER response:**
```json
{ "orders": [{ ...OrderToken, "verified_state": "PENDING", "verified": true, "verified_proof": {...} }] }
```

**CARRIER response:**
```json
{
  "pending": [{ ...OrderToken, "verified": true, ... }],
  "my_booked": [{ ...OrderToken, "verified": true, ... }]
}
```

### `POST /api/orders/:order_id/book`
Book a PENDING load (CARRIER only).

**Headers:** `x-actor-did: did:iota:...`

Pre-conditions:
- Network verification must confirm state = PENDING
- Actor must be a CARRIER

**Response:** `{ token: OrderToken, proof: NetworkProof }`

### `POST /api/orders/:order_id/done`
Mark a BOOKED load as done (CARRIER only, same carrier who booked).

**Headers:** `x-actor-did: did:iota:...`

Pre-conditions:
- Network verification must confirm state = BOOKED
- Network verification must confirm carrier_did = actor's DID

**Response:** `{ token: OrderToken, proof: NetworkProof }`

---

## State Machine

```
PENDING ──→ BOOKED ──→ DONE
   │           │
   └──→ CANCELLED ←──┘
   │
   └──→ EXPIRED
```

### Transition Rules

| From | To | Who | Conditions |
|------|----|-----|------------|
| (new) | PENDING | SHIPPER | Must be SHIPPER role |
| PENDING | BOOKED | CARRIER | Must be CARRIER role; sets carrier_did immutably |
| BOOKED | DONE | CARRIER | Must be the SAME carrier (actor_did == token.carrier_did) |
| PENDING | CANCELLED | SHIPPER | Must be the issuing shipper |

### Authorization Logic

All transitions are validated by two pure functions:

- `canTransition(currentState, nextState)` — structural validity
- `canActorPerformTransition(actor, token, nextState)` — role + ownership checks

Invalid attempts return HTTP 403 with a descriptive reason.

### Network Verification

Before every state-changing action, the system:
1. Calls `network.verify(order_id)` to get the on-network state
2. Checks that the on-network state matches the expected pre-condition
3. Only proceeds if `verified: true`
4. After the state change, calls `network.anchorUpdate()` to record the new state

This ensures no phantom loads — every load and every transition exists on the network.

---

## Swapping MockIotaAdapter for Real IOTA

The `NetworkAdapter` interface in `src/services/network-adapter.ts` defines three methods:

```typescript
interface NetworkAdapter {
  anchorCreate(orderId, fingerprint, issuerDid, state) → Promise<NetworkProof>
  anchorUpdate(orderId, newState, issuerDid, carrierDid?, prevProof?) → Promise<NetworkProof>
  verify(orderId) → Promise<VerificationResult>
}
```

To connect to real IOTA:

1. Create `src/services/iota-adapter.ts` implementing `NetworkAdapter`
2. Use `@iota/sdk` or `@iota/identity-wasm` to:
   - `anchorCreate`: Create an output/NFT on the Tangle with order metadata
   - `anchorUpdate`: Update the output state on the Tangle
   - `verify`: Read the latest output state from the Tangle and validate
3. Update `getNetworkAdapter()` to return your real adapter:

```typescript
// In mock-iota-adapter.ts or a new factory file:
import { IotaAdapter } from './iota-adapter';

export function getNetworkAdapter(): NetworkAdapter {
  if (process.env.IOTA_NODE_URL) {
    return new IotaAdapter(process.env.IOTA_NODE_URL);
  }
  return new MockIotaAdapter();
}
```

### Swapping In-Memory Storage for a Database

The `src/lib/store.ts` module exposes simple CRUD functions. Replace with Prisma + SQLite:

1. `npm install prisma @prisma/client`
2. Define schema in `prisma/schema.prisma` with DIDProfile and OrderToken models
3. Replace store functions with Prisma queries
4. Run `npx prisma migrate dev`

---

## Data Model

### DIDProfile
| Field | Type | Description |
|-------|------|-------------|
| wallet_address | string (unique) | Connected wallet |
| did | string (unique) | Generated DID |
| role | SHIPPER \| CARRIER | User role |
| company_name | string | Company name |
| country | string | Country |
| legal_id_hash | string | SHA-256 of legal ID |
| load_id_standard | string? | Shipper-only |

### OrderToken
| Field | Type | Description |
|-------|------|-------------|
| order_id | string (unique) | e.g. ORD-A1B2C3D4 |
| issuer_did | string | Shipper who created it |
| carrier_did | string? | Carrier who booked (null until BOOKED) |
| state | enum | PENDING, BOOKED, DONE, CANCELLED, EXPIRED |
| payload_offledger | JSON | Lane, date, weight, reference |
| fingerprint | string | SHA-256 of payload + issuer |
| created_at | ISO string | Creation timestamp |
| updated_at | ISO string | Last modification |
| last_network_proof | string? | TX ID of last anchor |
| last_verified_at | ISO string? | Last verification timestamp |
