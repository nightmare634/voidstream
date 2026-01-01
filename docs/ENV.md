# Voidstream Environment Variables

This project uses SvelteKit. **Client-exposed** environment variables must be prefixed with `PUBLIC_`.

## Required (client)

- `PUBLIC_PB_URL`
  - Example: `https://your-pocketbase.up.railway.app`
  - Used by the browser to read/write records via PocketBase rules.

- `PUBLIC_SOLANA_CLUSTER`
  - Example: `mainnet-beta`
  - Supported: `mainnet-beta`, `devnet`, `testnet`
  - Used for cluster-aware defaults (Solscan links, RPC fallbacks).

- `PUBLIC_SOLSCAN_BASE`
  - Example (mainnet): `https://solscan.io`
  - Example (devnet): `https://solscan.io/?cluster=devnet`
  - Used to generate proof links for tx signatures and addresses.

- `PUBLIC_SOLANA_RPC_HTTP`
  - Example (mainnet fallback): `https://api.mainnet-beta.solana.com`
  - Used as a fallback JSON-RPC endpoint for reading balances.

- `PUBLIC_HELIUS_API_KEY`
  - Used for wallet balance streaming (WS when configured).

- `PUBLIC_HELIUS_RPC_HTTP`
  - Example (mainnet Enhanced RPC): `https://mainnet.helius-rpc.com/`
  - If set, the client will use this for HTTP JSON-RPC reads (and will append `api-key=` if missing).\n+
- `PUBLIC_HELIUS_RPC_WS`
  - Example (mainnet Atlas WS): `wss://atlas-mainnet.helius-rpc.com/`
  - If set, the client will use this for WebSocket balance streaming (and will append `api-key=` if missing).

## Required (server)

- `PB_ADMIN_EMAIL`
- `PB_ADMIN_PASSWORD`
  - Used by server endpoints and schema checks to perform admin operations.

## Optional (server)

- `AUTH_HMAC_SECRET`
  - Used if/when you enable wallet-signature → PocketBase auth token flows.

- `HELIUS_API_KEY`
- `HELIUS_WEBHOOK_SECRET`
- `HELIUS_WEBHOOK_ID`
  - Required for Helius webhook sync features.

## PocketBase Collections (expected)

This app expects the following collections (names are case-sensitive):

### `streams`
Core stream records.

Recommended fields:
- `payer` (text)
- `receiver` (text)
- `amountLamports` (number)
- `startAt` (date)
- `endAt` (date)
- `status` (select: `active`, `paused`, `cancelled`, `done`)
- `memo` (text, optional)
- `createdBy` (text, optional)

### `audit_logs`
Event history / proofs.

Recommended fields:
- `stream` (relation -> `streams`, optional)
- `type` (text)
- `message` (text)
- `signature` (text, optional)
- `actor` (text, optional)
- `meta` (json, optional)

### `contexts`
Consensus context settings.

Recommended fields:
- `mode` (select: `off`, `consensus`)
- `owners` (json) — wallet pubkeys list (e.g. `["...","...","..."]`)

### `approvals`
Approval requests and quorum tracking.

Recommended fields:
- `context` (relation -> `contexts`)
- `stream` (relation -> `streams`, optional)
- `action` (select: `create`, `pause`, `resume`, `cancel`, `timeline_update`, `withdraw`)
- `status` (select: `pending`, `approved`, `executed`, `rejected`)
- `requestedBy` (text)
- `approvers` (json) — list of wallet pubkeys that approved
- `payload` (json) — action payload

### `invoices`
Generated invoice records.

Recommended fields:
- `stream` (relation -> `streams`)
- `pdf` (file)
- `number` (text)
- `meta` (json, optional)

## Schema verification

Use the health endpoint:
- `GET /api/health/schema`

Or run the setup script (admin creds required):
- `node scripts/pb_setup.mjs`











